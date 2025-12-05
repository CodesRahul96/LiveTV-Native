const http = require("http");
const url = require("url");

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/license") {
    const keysBase64 = parsedUrl.query.keys;
    if (keysBase64) {
      try {
        const keysJson = Buffer.from(keysBase64, "base64").toString("utf-8");
        console.log(`[${new Date().toISOString()}] Serving license keys`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(keysJson);
      } catch (e) {
        console.error("Error decoding keys:", e);
        res.writeHead(400);
        res.end("Invalid keys");
      }
    } else {
      res.writeHead(400);
      res.end("Missing keys parameter");
    }
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`License server running at http://localhost:${PORT}/license`);
});
