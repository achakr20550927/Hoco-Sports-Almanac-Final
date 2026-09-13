// Local-only backup intake. Customer data is never written into the repository.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const token = crypto.randomBytes(24).toString("hex");
const base = path.join(os.homedir(), "Documents", "HoCo-Private-Backups");
const escape = value => String(value ?? "").replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const fields = ["name", "email", "plan", "subscription", "accountType", "stripeCustomerId", "stripeSubscriptionId", "currentPeriodEnd", "cancelAtPeriodEnd", "signedUpAt", "updatedAt", "authUserId", "authLinkedAt"];
const server = http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  if (req.url !== `/${token}`) { res.writeHead(404).end("Not found"); return; }
  if (req.method === "GET") {
    res.end(`<title>Private Membership Backup</title><h1>Private Membership Backup</h1><form method="POST"><label for="backup">Exported membership JSON</label><br><textarea id="backup" name="backup" rows="12" cols="80" required></textarea><br><button>Save Private Backup</button></form>`);
    return;
  }
  if (req.method !== "POST") { res.writeHead(405).end(); return; }
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 5_000_000) throw new Error("Backup exceeds the intake limit");
    }
    const raw = new URLSearchParams(body).get("backup");
    const backup = JSON.parse(raw);
    if (!Array.isArray(backup.members) || backup.recordCount !== backup.members.length || !backup.members.length || backup.source !== "Netlify members/accounts") throw new Error("Invalid or incomplete member export");
    const counts = {};
    const seen = new Set();
    let duplicates = 0;
    for (const member of backup.members) {
      if (!member || typeof member.email !== "string") throw new Error("A record has no email");
      const email = member.email.trim().toLowerCase();
      if (seen.has(email)) duplicates++;
      seen.add(email);
      const plan = String(member.plan || "unspecified");
      counts[plan] = (counts[plan] || 0) + 1;
    }
    fs.mkdirSync(base, { recursive: true, mode: 0o700 });
    const directory = fs.mkdtempSync(path.join(base, new Date().toISOString().slice(0, 10) + "-"));
    fs.chmodSync(directory, 0o700);
    const json = JSON.stringify(backup, null, 2) + "\n";
    fs.writeFileSync(path.join(directory, "members-full.json"), json, { mode: 0o600, flag: "wx" });
    const roster = `<table><thead><tr>${fields.map(x=>`<th>${escape(x)}</th>`).join("")}</tr></thead><tbody>${backup.members.map(m=>`<tr>${fields.map(f=>`<td>${escape(m[f])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const doc = `<!doctype html><meta charset="utf-8"><title>HoCo Membership Backup</title><style>body{font:14px system-ui;margin:28px;color:#111}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #bbb;padding:8px;text-align:left;overflow-wrap:anywhere}th{background:#eee}p{max-width:850px}@media print{body{margin:0}table{font-size:8px}}</style><h1>HoCo Sports Almanac: Private Membership Backup</h1><p>Exported: ${escape(backup.exportedAt)}. Records: ${backup.recordCount}. Unique normalized emails: ${seen.size}. Duplicate emails requiring review: ${duplicates}.</p><p>Recorded plans: ${escape(JSON.stringify(counts))}. These are stored membership labels, not a live Stripe payment audit. Existing plans and Stripe IDs must be preserved. All original fields are retained in members-full.json.</p><p>No passwords can be recovered from the old login. Use verified ownership and a managed authentication service for password setup. Do not publish this backup or import billing IDs into client-editable metadata.</p>${roster}`;
    fs.writeFileSync(path.join(directory, "Membership-Backup.html"), doc, { mode: 0o600, flag: "wx" });
    const manifest = { savedAt: new Date().toISOString(), exportedAt: backup.exportedAt, records: backup.recordCount, uniqueEmails: seen.size, duplicates, plans: counts, sha256: crypto.createHash("sha256").update(json).digest("hex"), source: backup.source };
    fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ directory, ...manifest }));
    res.end(`<title>Backup Saved</title><h1>Backup saved</h1><p>${backup.recordCount} records saved in ${escape(directory)}.</p><p>The full JSON, readable document, and checksum manifest were saved. No customer records were changed.</p>`);
  } catch (error) { res.writeHead(400).end(`<h1>Backup not saved</h1><p>${escape(error.message)}</p>`); }
});
server.listen(4176, "127.0.0.1", () => console.log(`Private backup intake: http://127.0.0.1:4176/${token}`));
