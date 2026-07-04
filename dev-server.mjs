import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function proxyFootballData(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const league = url.searchParams.get("league");
  const season = url.searchParams.get("season");

  if (!league || !season || !/^[A-Z0-9]+$/.test(league) || !/^[0-9]{4}$/.test(season)) {
    send(res, 400, JSON.stringify({ error: "Paramètres invalides." }), {
      "content-type": "application/json; charset=utf-8",
    });
    return;
  }

  const remote = `https://www.football-data.co.uk/mmz4281/${season}/${league}.csv`;
  const response = await fetch(remote);
  if (!response.ok) {
    send(res, response.status, JSON.stringify({ error: `Fichier introuvable: ${league}_${season}` }), {
      "content-type": "application/json; charset=utf-8",
    });
    return;
  }

  send(res, 200, await response.text(), {
    "content-type": "text/csv; charset=latin1",
  });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === "/api/football-data") {
      await proxyFootballData(req, res);
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const body = await readFile(filePath);
    send(res, 200, body, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
  } catch (error) {
    send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
  }
}).listen(port, () => {
  console.log(`Local preview: http://localhost:${port}`);
});
