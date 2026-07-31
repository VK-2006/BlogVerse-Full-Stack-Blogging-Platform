import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, purpose: "session" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function signAccountRecoveryToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, purpose: "account-recovery" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
}

export function verifyAccountRecoveryToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.purpose !== "account-recovery") {
    throw new Error("Invalid account recovery token.");
  }
  return payload;
}
