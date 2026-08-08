import crypto from "node:crypto";

const CLOUDINARY_FOLDER = "blogverse/posts";

function credentials() {
  return {
    cloudName: String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
    apiKey: String(process.env.CLOUDINARY_API_KEY || "").trim(),
    apiSecret: String(process.env.CLOUDINARY_API_SECRET || "").trim()
  };
}

export function cloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = credentials();
  return Boolean(cloudName && apiKey && apiSecret);
}

function createSignature(params, apiSecret) {
  const source = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${source}${apiSecret}`).digest("hex");
}

function cloudinaryUrl(cloudName, resourceType, action = "upload") {
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/${action}`;
}

export async function uploadPostFile(file) {
  const { cloudName, apiKey, apiSecret } = credentials();
  if (!cloudName || !apiKey || !apiSecret) {
    throw Object.assign(new Error("Persistent file storage is not configured. Add the Cloudinary environment variables."), { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams = { folder: CLOUDINARY_FOLDER, timestamp };
  const signature = createSignature(signedParams, apiSecret);
  const form = new FormData();

  form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", CLOUDINARY_FOLDER);
  form.append("signature", signature);

  const response = await fetch(cloudinaryUrl(cloudName, "auto"), {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30000)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.secure_url || !body.public_id) {
    throw Object.assign(
      new Error(body.error?.message || `Cloudinary upload failed with HTTP ${response.status}.`),
      { status: 502 }
    );
  }

  return {
    originalName: file.originalname,
    storedName: `cloudinary:${body.resource_type || "raw"}:${body.public_id}`,
    url: body.secure_url,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function deleteCloudinaryAsset(storedName) {
  const match = /^cloudinary:([^:]+):(.+)$/.exec(String(storedName || ""));
  if (!match) return false;

  const [, resourceType, publicId] = match;
  const { cloudName, apiKey, apiSecret } = credentials();
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(`Cloudinary is not configured; could not delete ${publicId}.`);
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams = { public_id: publicId, timestamp };
  const signature = createSignature(signedParams, apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature
  });

  const response = await fetch(cloudinaryUrl(cloudName, resourceType, "destroy"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15000)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !["ok", "not found"].includes(result.result)) {
    throw new Error(result.error?.message || `Cloudinary delete failed with HTTP ${response.status}.`);
  }

  return true;
}
