// Isolated preview: all account, article and billing changes stay in memory.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { harness, fixtures } = require("./qa-harness.cjs");
const app = harness(fixtures(), {}, { env: { AUTH_MODE: process.env.QA_AUTH_MODE || "legacy" } });
const root = path.resolve(__dirname, "..");
const allowed = new Set(["/", "/index.html", "/app.js", "/access-policy.js", "/auth.bundle.js", "/styles.css"]);
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost:4175");
    if (url.pathname.startsWith("/.netlify/functions/")) {
      const name = url.pathname.split("/").pop();
      if (!/^[a-z-]+$/.test(name)) { response.writeHead(404).end(); return; }
      let body = "";
      for await (const chunk of request) body += chunk;
      const result = await app.load(`${name}.js`).handler({ httpMethod: request.method, headers: request.headers, queryStringParameters: Object.fromEntries(url.searchParams), body }, {});
      response.writeHead(result.statusCode, result.headers);
      response.end(result.isBase64Encoded ? Buffer.from(result.body, "base64") : result.body);
      return;
    }
    if (!allowed.has(url.pathname)) { response.writeHead(404).end(); return; }
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    response.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html", "cache-control": "no-store" });
    response.end(fs.readFileSync(path.join(root, file)));
  } catch (error) { response.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: error.message })); }
});
server.listen(4175, "127.0.0.1", () => console.log("Isolated QA preview: http://127.0.0.1:4175"));
