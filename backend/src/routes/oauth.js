import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { signToken } from "../utils/jwt.js";

const router = Router();

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000;
const OAUTH_CLIENT_STATE_PATTERN = /^[A-Za-z0-9_-]{32,160}$/;
const OAUTH_FETCH_TIMEOUT_MS = Math.min(20000, Math.max(5000, Number(process.env.OAUTH_FETCH_TIMEOUT_MS) || 10000));

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  bio: true,
  headline: true,
  occupation: true,
  location: true,
  website: true,
  socialLink: true,
  lastLoginAt: true,
  lastSeenAt: true,
  deletionRequestedAt: true,
  deletionScheduledFor: true
};

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function backendBaseUrl() {
  return cleanBaseUrl(process.env.OAUTH_BACKEND_URL);
}

function frontendBaseUrl() {
  return cleanBaseUrl(process.env.FRONTEND_URL || "http://localhost:5173");
}

function facebookVersionPrefix() {
  const version = String(process.env.FACEBOOK_GRAPH_VERSION || "").trim();
  if (!version) return "";
  return version.startsWith("v") ? `/${version}` : `/v${version}`;
}

function providerConfig(provider) {
  const redirectUri = new URL("/oauth/callback", `${frontendBaseUrl()}/`).toString();

  if (provider === "google") {
    return {
      provider: "GOOGLE",
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    };
  }

  if (provider === "facebook") {
    return {
      provider: "FACEBOOK",
      configured: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri
    };
  }

  return null;
}

function stateSigningKey() {
  const secret = String(process.env.JWT_SECRET || "");
  if (!secret) throw new Error("JWT_SECRET is required for OAuth state signing.");
  return crypto.createHash("sha256").update(`blogverse:oauth-state:v2:${secret}`).digest();
}

function safeTextEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSignedState(provider, clientState) {
  const payload = {
    v: 2,
    p: provider,
    c: clientState,
    n: crypto.randomBytes(24).toString("base64url"),
    iat: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", stateSigningKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySignedState(value, provider) {
  try {
    const parts = String(value || "").split(".");
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expected = crypto.createHmac("sha256", stateSigningKey()).update(encoded).digest("base64url");
    if (!safeTextEqual(signature, expected)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const age = Date.now() - Number(payload.iat);

    if (
      payload.v !== 2 ||
      payload.p !== provider ||
      !OAUTH_CLIENT_STATE_PATTERN.test(String(payload.c || "")) ||
      !Number.isFinite(Number(payload.iat)) ||
      age < -60_000 ||
      age > OAUTH_STATE_TTL_MS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildAuthorizationUrl(provider, config, state) {
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  const versionPrefix = facebookVersionPrefix();
  const url = new URL(`https://www.facebook.com${versionPrefix}/dialog/oauth`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("state", state);
  return url.toString();
}

function redirectFrontend(res, params = {}) {
  const target = new URL("/oauth/callback", `${frontendBaseUrl()}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, String(value));
    }
  });
  res.setHeader("Referrer-Policy", "no-referrer");
  return res.redirect(302, target.toString());
}

function providerError(res, code, message) {
  return redirectFrontend(res, {
    error: code || "OAUTH_FAILED",
    message: message || "Social sign-in could not be completed."
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error("OAuth provider request failed.");
    error.status = response.status;
    error.providerPayload = data;
    throw error;
  }

  return data;
}

async function googleProfile(code, config) {
  const token = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!token.access_token) throw new Error("Google did not return an access token.");

  const profile = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  if (!profile.sub || !profile.email || profile.email_verified !== true) {
    throw new Error("Google account must provide a verified email address.");
  }

  return {
    provider: "GOOGLE",
    providerUserId: String(profile.sub),
    email: String(profile.email).trim().toLowerCase(),
    emailVerified: true,
    name: String(profile.name || profile.given_name || "BlogVerse User").trim().slice(0, 60),
    avatar: profile.picture ? String(profile.picture) : null
  };
}

async function facebookProfile(code, config) {
  const versionPrefix = facebookVersionPrefix();
  const token = await fetchJson(`https://graph.facebook.com${versionPrefix}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code
    })
  });

  if (!token.access_token) throw new Error("Facebook did not return an access token.");

  const meUrl = new URL(`https://graph.facebook.com${versionPrefix}/me`);
  meUrl.searchParams.set("fields", "id,name,email,picture.type(large)");

  const profile = await fetchJson(meUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  if (!profile.id || !profile.email) {
    throw new Error("Facebook did not provide an email address. Make sure the email permission is enabled for the app and available on the Facebook account.");
  }

  return {
    provider: "FACEBOOK",
    providerUserId: String(profile.id),
    email: String(profile.email).trim().toLowerCase(),
    emailVerified: true,
    name: String(profile.name || "BlogVerse User").trim().slice(0, 60),
    avatar: profile.picture?.data?.url ? String(profile.picture.data.url) : null
  };
}

async function normalizeExistingUser(user, profile) {
  if (!user) return null;

  if (user.isBlocked || user.isDisabled) {
    const error = new Error(user.disabledReason || "This BlogVerse account is disabled.");
    error.code = "ACCOUNT_DISABLED";
    throw error;
  }

  if (user.deletionScheduledFor && user.deletionScheduledFor <= new Date()) {
    await prisma.user.delete({ where: { id: user.id } });
    return null;
  }

  const now = new Date();
  return prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: now,
      lastSeenAt: now,
      deletionRequestedAt: user.deletionScheduledFor ? null : user.deletionRequestedAt,
      deletionScheduledFor: null,
      ...(profile.avatar && !user.avatar ? { avatar: profile.avatar } : {})
    },
    select: safeUserSelect
  });
}

async function createOAuthUser(profile) {
  const temporaryPassword = crypto.randomBytes(48).toString("base64url");
  const now = new Date();

  return prisma.user.create({
    data: {
      name: profile.name || "BlogVerse User",
      email: profile.email,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      avatar: profile.avatar,
      lastLoginAt: now,
      lastSeenAt: now,
      oauthAccounts: {
        create: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          providerEmail: profile.email
        }
      }
    },
    select: safeUserSelect
  });
}

async function resolveOAuthUser(profile) {
  const linked = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId
      }
    },
    include: { user: true }
  });

  if (linked) {
    const normalized = await normalizeExistingUser(linked.user, profile);
    if (normalized) {
      if (linked.providerEmail !== profile.email) {
        await prisma.oAuthAccount.update({
          where: { id: linked.id },
          data: { providerEmail: profile.email }
        });
      }
      return normalized;
    }
    return createOAuthUser(profile);
  }

  let existing = await prisma.user.findUnique({ where: { email: profile.email } });
  existing = await normalizeExistingUser(existing, profile);

  if (existing) {
    await prisma.oAuthAccount.create({
      data: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        userId: existing.id
      }
    });
    return existing;
  }

  return createOAuthUser(profile);
}

function hashLoginCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function createLoginCode(userId) {
  const now = new Date();
  await prisma.oAuthLoginCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { usedAt: { not: null } }
      ]
    }
  });

  const rawCode = crypto.randomBytes(32).toString("base64url");
  await prisma.oAuthLoginCode.create({
    data: {
      codeHash: hashLoginCode(rawCode),
      userId,
      expiresAt: new Date(Date.now() + OAUTH_CODE_TTL_MS)
    }
  });
  return rawCode;
}

router.get("/providers", (_req, res) => {
  res.json({
    success: true,
    providers: {
      google: providerConfig("google")?.configured || false,
      facebook: providerConfig("facebook")?.configured || false
    }
  });
});

router.post("/:provider/authorization-url", (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const config = providerConfig(provider);

  if (!config) {
    return res.status(404).json({ success: false, message: "Unknown OAuth provider." });
  }
  if (!config.configured) {
    return res.status(503).json({
      success: false,
      code: "OAUTH_NOT_CONFIGURED",
      message: `${provider === "google" ? "Google" : "Facebook"} sign-in is not configured yet.`
    });
  }

  const clientState = String(req.body?.clientState || "").trim();
  if (!OAUTH_CLIENT_STATE_PATTERN.test(clientState)) {
    return res.status(400).json({
      success: false,
      code: "OAUTH_CLIENT_STATE_INVALID",
      message: "A secure social sign-in session could not be started. Please refresh and try again."
    });
  }

  const state = createSignedState(provider, clientState);
  return res.json({
    success: true,
    provider,
    state,
    authorizationUrl: buildAuthorizationUrl(provider, config, state)
  });
});

router.post("/:provider/complete", async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const config = providerConfig(provider);

  try {
    if (!config || !config.configured) {
      return res.status(503).json({
        success: false,
        code: "OAUTH_NOT_CONFIGURED",
        message: "This social sign-in provider is not configured."
      });
    }

    const { code, state } = z.object({
      code: z.string().trim().min(10).max(4096),
      state: z.string().trim().min(20).max(4096)
    }).parse(req.body);

    const statePayload = verifySignedState(state, provider);
    if (!statePayload) {
      return res.status(400).json({
        success: false,
        code: "OAUTH_STATE_INVALID",
        message: "The social sign-in session expired or could not be verified. Please try again."
      });
    }

    const profile = provider === "google"
      ? await googleProfile(code, config)
      : await facebookProfile(code, config);

    const user = await resolveOAuthUser(profile);

    return res.json({
      success: true,
      message: `Welcome to BlogVerse, ${user.name}!`,
      prompt: "Social sign-in completed successfully.",
      token: signToken(user),
      user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        code: "OAUTH_RESPONSE_INVALID",
        message: "The social sign-in response is incomplete or invalid."
      });
    }

    console.error(`OAuth ${provider} completion failed:`, error.message);
    const code = error.code === "ACCOUNT_DISABLED" ? "ACCOUNT_DISABLED" : "OAUTH_FAILED";
    const message = error.code === "ACCOUNT_DISABLED"
      ? error.message
      : `${provider === "google" ? "Google" : "Facebook"} sign-in could not be completed. Please try again.`;

    return res.status(error.code === "ACCOUNT_DISABLED" ? 403 : 400).json({
      success: false,
      code,
      message
    });
  }
});

router.get("/:provider/start", (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const config = providerConfig(provider);

  if (!config) {
    return res.status(404).json({ success: false, message: "Unknown OAuth provider." });
  }
  if (!config.configured) {
    return providerError(res, "OAUTH_NOT_CONFIGURED", `${provider === "google" ? "Google" : "Facebook"} sign-in is not configured yet.`);
  }

  const clientState = String(req.query.client_state || "").trim();
  if (!OAUTH_CLIENT_STATE_PATTERN.test(clientState)) {
    return providerError(res, "OAUTH_CLIENT_STATE_INVALID", "A secure social sign-in session could not be started. Please refresh and try again.");
  }

  const state = createSignedState(provider, clientState);
  return res.redirect(302, buildAuthorizationUrl(provider, config, state));
});

router.get("/:provider/callback", async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const config = providerConfig(provider);

  try {
    if (!config || !config.configured) {
      return providerError(res, "OAUTH_NOT_CONFIGURED", "This social sign-in provider is not configured.");
    }

    if (req.query.error) {
      return providerError(res, "OAUTH_CANCELLED", "Social sign-in was cancelled or permission was not granted.");
    }

    const statePayload = verifySignedState(String(req.query.state || ""), provider);
    if (!statePayload) {
      return providerError(res, "OAUTH_STATE_INVALID", "The social sign-in session expired or could not be verified. Please try again.");
    }

    const code = String(req.query.code || "");
    if (!code) {
      return providerError(res, "OAUTH_CODE_MISSING", "The OAuth provider did not return an authorization code.");
    }

    const profile = provider === "google"
      ? await googleProfile(code, config)
      : await facebookProfile(code, config);

    const user = await resolveOAuthUser(profile);
    const loginCode = await createLoginCode(user.id);
    return redirectFrontend(res, { code: loginCode, provider, state: statePayload.c });
  } catch (error) {
    console.error(`OAuth ${provider} callback failed:`, error.message);
    const code = error.code === "ACCOUNT_DISABLED" ? "ACCOUNT_DISABLED" : "OAUTH_FAILED";
    const message = error.code === "ACCOUNT_DISABLED"
      ? error.message
      : `${provider === "google" ? "Google" : "Facebook"} sign-in could not be completed. Please try again.`;
    return providerError(res, code, message);
  }
});

router.post("/exchange", async (req, res, next) => {
  try {
    const { code } = z.object({
      code: z.string().trim().min(20).max(200)
    }).parse(req.body);

    const now = new Date();
    const codeHash = hashLoginCode(code);
    const loginCode = await prisma.oAuthLoginCode.findUnique({
      where: { codeHash },
      include: { user: true }
    });

    if (!loginCode || loginCode.usedAt || loginCode.expiresAt <= now) {
      return res.status(400).json({
        success: false,
        code: "OAUTH_CODE_INVALID",
        message: "This social sign-in session has expired. Please try again."
      });
    }

    if (loginCode.user.isBlocked || loginCode.user.isDisabled) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: loginCode.user.disabledReason || "This BlogVerse account is disabled."
      });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const redeemed = await transaction.oAuthLoginCode.updateMany({
        where: {
          id: loginCode.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });

      if (redeemed.count !== 1) return null;

      return transaction.user.update({
        where: { id: loginCode.userId },
        data: { lastLoginAt: now, lastSeenAt: now },
        select: safeUserSelect
      });
    });

    if (!result) {
      return res.status(400).json({
        success: false,
        code: "OAUTH_CODE_INVALID",
        message: "This social sign-in session has already been used."
      });
    }

    res.json({
      success: true,
      message: `Welcome to BlogVerse, ${result.name}!`,
      prompt: "Social sign-in completed successfully.",
      token: signToken(result),
      user: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "A valid social sign-in code is required." });
    }
    next(error);
  }
});

export default router;
