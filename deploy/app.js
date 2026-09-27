// Startup file for Plesk / cPanel "Node.js" (Phusion Passenger) and for `node app.js`.
// Loads .env, points the database at ./data/reserve.db and starts Next.js.
const fs = require("fs");
const path = require("path");

// Minimal .env loader (no dependency): KEY=value lines, ignores comments.
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
process.env.DATABASE_URL = "file:" + path.join(__dirname, "data", "reserve.db");
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
// Passenger provides PORT; when run by hand default to 3000.
process.env.PORT = process.env.PORT || "3000";

require("./server.js");
