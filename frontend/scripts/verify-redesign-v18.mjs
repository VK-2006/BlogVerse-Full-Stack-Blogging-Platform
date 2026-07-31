import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd());
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "app-redesign.css"), "utf8");
const required = [
  "--bg:", "--surface:", "--text:", "--heading:",
  ".hero h1", ".community-hero h1", ".auth-brand-panel h1",
  ".contact-form", ".admin-message-card", "[data-theme=\"dark\"]"
];

if (!main.includes('import "./app-redesign.css"')) {
  throw new Error("main.jsx does not import app-redesign.css");
}

for (const legacy of ["styles.css", "ui-v11.css", "admin-v13.css", "theme-contrast-v14.css", "light-theme-v17.css"]) {
  if (main.includes(legacy)) throw new Error(`Legacy stylesheet still imported: ${legacy}`);
}

for (const token of required) {
  if (!css.includes(token)) throw new Error(`Required redesign rule missing: ${token}`);
}

console.log("BlogVerse V18 redesign source checks passed.");
