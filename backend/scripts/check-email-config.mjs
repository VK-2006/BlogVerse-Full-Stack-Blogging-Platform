import "dotenv/config";
import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "FRONTEND_URL"];
const missing = required.filter((key) => !String(process.env[key] || "").trim());

if (missing.length) {
  console.error("Password reset email configuration is incomplete.");
  console.error(`Missing variables: ${missing.join(", ")}`);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000
});

try {
  await transporter.verify();
  console.log("SMTP verification passed.");
  console.log(`Reset links will use: ${process.env.FRONTEND_URL}`);
} catch (error) {
  console.error("SMTP verification failed:", error.message);
  process.exit(1);
}
