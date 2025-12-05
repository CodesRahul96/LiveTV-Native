const fs = require("fs");
const https = require("https");
const http = require("http");
const url = require("url");

const CHANNELS_FILE = "assets/channels.json";
const CONCURRENCY = 10; // Number of parallel checks

const checkChannel = (channel) => {
  return new Promise((resolve) => {
    let targetUrl = channel.url;
    let headers = {};

    // Parse URL and headers from the custom format
    // Format: URL|Key1="Value1"&Key2="Value2"
    if (targetUrl.includes("|")) {
      const parts = targetUrl.split("|");
      targetUrl = parts[0];
      const headerString = parts[1];

      const headerPairs = headerString.split("&");
      headerPairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          // Remove quotes from value
          headers[key] = value.replace(/"/g, "");
        }
      });
    }

    // Default User-Agent if not provided
    if (!headers["User-Agent"]) {
      headers["User-Agent"] =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    }

    const parsedUrl = url.parse(targetUrl);
    const requestModule = parsedUrl.protocol === "https:" ? https : http;

    const options = {
      method: "HEAD",
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      headers: headers,
      timeout: 5000, // 5 seconds timeout
    };

    const req = requestModule.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({
          id: channel.id,
          name: channel.name,
          status: "OK",
          code: res.statusCode,
        });
      } else {
        resolve({
          id: channel.id,
          name: channel.name,
          status: "FAIL",
          code: res.statusCode,
        });
      }
    });

    req.on("error", (err) => {
      resolve({
        id: channel.id,
        name: channel.name,
        status: "ERROR",
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ id: channel.id, name: channel.name, status: "TIMEOUT" });
    });

    req.end();
  });
};

const processChannels = async () => {
  try {
    const data = fs.readFileSync(CHANNELS_FILE, "utf8");
    const channels = JSON.parse(data);

    console.log(`Testing ${channels.length} channels...`);

    let results = {
      working: 0,
      failed: 0,
      details: [],
    };

    // Process in chunks
    for (let i = 0; i < channels.length; i += CONCURRENCY) {
      const chunk = channels.slice(i, i + CONCURRENCY);
      const promises = chunk.map((channel) => checkChannel(channel));
      const chunkResults = await Promise.all(promises);

      chunkResults.forEach((res) => {
        if (res.status === "OK") {
          results.working++;
          // console.log(`[OK] ${res.name}`);
        } else {
          results.failed++;
          console.log(
            `[${res.status}] ${res.name} (${res.code || res.error || ""})`
          );
        }
        results.details.push(res);
      });

      // Progress indicator
      process.stdout.write(
        `\rProcessed: ${Math.min(i + CONCURRENCY, channels.length)}/${
          channels.length
        } | Working: ${results.working} | Failed: ${results.failed}`
      );
    }

    console.log("\n\n--- Summary ---");
    console.log(`Total: ${channels.length}`);
    console.log(`Working: ${results.working}`);
    console.log(`Failed: ${results.failed}`);

    // Save working channels to a new file
    const workingChannels = channels.filter((c) => {
      const res = results.details.find((r) => r.id === c.id);
      return res && res.status === "OK";
    });

    fs.writeFileSync(
      "assets/channels_working.json",
      JSON.stringify(workingChannels, null, 2)
    );
    console.log(
      `\nSaved ${workingChannels.length} working channels to assets/channels_working.json`
    );
  } catch (err) {
    console.error("Error:", err);
  }
};

processChannels();
