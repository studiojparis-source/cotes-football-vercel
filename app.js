const ODDS_COLUMNS = ["B365H", "B365D", "B365A"];
const LEAGUES = {
  "France Ligue 1": "F1",
  "Angleterre Premier League": "E0",
  "Angleterre Championship": "E1",
  "Allemagne Bundesliga": "D1",
  "Allemagne Bundesliga 2": "D2",
  "Espagne Liga": "SP1",
  "Espagne Liga 2": "SP2",
  "Italie Serie A": "I1",
  "Italie Serie B": "I2",
  "Pays-Bas Eredivisie": "N1",
  "Belgique Pro League": "B1",
  "Portugal Liga": "P1",
};
const SUPABASE_URL = "https://tuyntjezgxwscsapavzu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eW50amV6Z3h3c2NzYXBhdnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDcwMDYsImV4cCI6MjA5ODY4MzAwNn0.nuQdkaQFUra1vMJpE5cJwWS6knfGDKbKxwKbFOkI8tc";
const SUPABASE_PAGE_SIZE = 1000;

let base = [];

const $ = (id) => document.getElementById(id);

function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(String(value).replace(",", "."));
}

function leagueName(code) {
  const reverse = Object.fromEntries(Object.entries(LEAGUES).map(([name, value]) => [value, name]));
  const extra = {
    E1: "Angleterre Championship",
    SP2: "Espagne Liga 2",
    D2: "Allemagne Bundesliga 2",
    I2: "Italie Serie B",
    T1: "Turquie Super Lig",
    G1: "Grèce Super League",
    SC0: "Écosse Premiership",
  };
  return reverse[String(code)] || extra[String(code)] || String(code);
}

function addMissingCalculatedColumns(rows) {
  return rows.map((row) => {
    const out = { ...row };
    ["O1", "OX", "O2", "FTHG", "FTAG", "HTHG", "HTAG"].forEach((col) => {
      out[col] = toNumber(out[col]);
    });

    const totalGoals = out.FTHG + out.FTAG;
    out.Resultat = out.FTHG > out.FTAG ? "1" : out.FTHG === out.FTAG ? "N" : "2";
    out.BTTS = out.FTHG > 0 && out.FTAG > 0 ? "Oui" : "Non";
    out.BTTS_Non = out.FTHG === 0 || out.FTAG === 0 ? "Oui" : "Non";
    out.Home_Over05 = out.FTHG >= 1 ? "Oui" : "Non";
    out.Home_Under05 = out.FTHG === 0 ? "Oui" : "Non";
    out.Away_Over05 = out.FTAG >= 1 ? "Oui" : "Non";
    out.Away_Under05 = out.FTAG === 0 ? "Oui" : "Non";
    out.DC_1X = out.FTHG >= out.FTAG ? "Oui" : "Non";
    out.DC_X2 = out.FTAG >= out.FTHG ? "Oui" : "Non";
    out.DC_12 = out.FTHG !== out.FTAG ? "Oui" : "Non";
    out.Over15 = totalGoals >= 2 ? "Oui" : "Non";
    out.Under15 = totalGoals <= 1 ? "Oui" : "Non";
    out.Over25 = totalGoals >= 3 ? "Oui" : "Non";
    out.Under25 = totalGoals <= 2 ? "Oui" : "Non";
    out.Over35 = totalGoals >= 4 ? "Oui" : "Non";
    out.Under35 = totalGoals <= 3 ? "Oui" : "Non";
    out.Score = `${Math.trunc(out.FTHG)}-${Math.trunc(out.FTAG)}`;
    out.Nul_MT = out.HTHG === out.HTAG ? "Oui" : "Non";
    out.HomeWin_MT = out.HTHG > out.HTAG ? "Oui" : "Non";
    out.AwayWin_MT = out.HTHG < out.HTAG ? "Oui" : "Non";
    out.Score_MT = `${Math.trunc(out.HTHG)}-${Math.trunc(out.HTAG)}`;
    out.Buts_1MT = out.HTHG + out.HTAG;
    out.Buts_2MT = totalGoals - out.Buts_1MT;
    out.MT_Prolifique = out.Buts_1MT > out.Buts_2MT ? "1ère MT" : out.Buts_2MT > out.Buts_1MT ? "2ème MT" : "Égalité";
    return out;
  });
}

function yesNo(value) {
  return value ? "Oui" : "Non";
}

function mapSupabaseMatch(row) {
  return {
    Date: row.match_date || "",
    Championnat: row.championnat,
    Home: row.home,
    Away: row.away,
    O1: toNumber(row.o1),
    OX: toNumber(row.ox),
    O2: toNumber(row.o2),
    FTHG: toNumber(row.fthg),
    FTAG: toNumber(row.ftag),
    HTHG: toNumber(row.hthg),
    HTAG: toNumber(row.htag),
    Score: row.score,
    Score_MT: row.score_mt,
    Resultat: row.resultat,
    Over15: yesNo(row.over15),
    Under15: yesNo(row.under15),
    Over25: yesNo(row.over25),
    Under25: yesNo(row.under25),
    Over35: yesNo(row.over35),
    Under35: yesNo(row.under35),
    BTTS: yesNo(row.btts),
    BTTS_Non: yesNo(row.btts_non),
    Home_Over05: yesNo(row.home_over05),
    Home_Under05: yesNo(row.home_under05),
    Away_Over05: yesNo(row.away_over05),
    Away_Under05: yesNo(row.away_under05),
    DC_1X: yesNo(row.dc_1x),
    DC_X2: yesNo(row.dc_x2),
    DC_12: yesNo(row.dc_12),
    Nul_MT: yesNo(row.nul_mt),
    HomeWin_MT: yesNo(row.homewin_mt),
    AwayWin_MT: yesNo(row.awaywin_mt),
    Buts_1MT: toNumber(row.buts_1mt),
    Buts_2MT: toNumber(row.buts_2mt),
    MT_Prolifique: row.mt_prolifique,
    Season: row.season,
  };
}

async function fetchSupabasePage(from, to) {
  const columns = [
    "match_date",
    "season",
    "championnat",
    "home",
    "away",
    "o1",
    "ox",
    "o2",
    "fthg",
    "ftag",
    "hthg",
    "htag",
    "score",
    "score_mt",
    "resultat",
    "over15",
    "under15",
    "over25",
    "under25",
    "over35",
    "under35",
    "btts",
    "btts_non",
    "home_over05",
    "home_under05",
    "away_over05",
    "away_under05",
    "dc_1x",
    "dc_x2",
    "dc_12",
    "nul_mt",
    "homewin_mt",
    "awaywin_mt",
    "buts_1mt",
    "buts_2mt",
    "mt_prolifique",
  ].join(",");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/matches?select=${columns}&order=id.asc`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Range: `${from}-${to}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: impossible de charger la base`);
  }
  return response.json();
}

async function loadBaseFromSupabase() {
  const rows = [];
  let from = 0;
  while (true) {
    $("status").textContent = `Chargement Supabase... ${rows.length.toLocaleString("fr-FR")} matchs`;
    const page = await fetchSupabasePage(from, from + SUPABASE_PAGE_SIZE - 1);
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  base = rows.map(mapSupabaseMatch);
  $("status").textContent = `Base Supabase chargée : ${base.length.toLocaleString("fr-FR")} matchs`;
  updateBaseUI();
}

function prepareData(rawRows, sourceName = "") {
  const prepared = [];
  const first = rawRows[0] || {};
  const cols = Object.keys(first);
  const lowerMap = Object.fromEntries(cols.map((col) => [String(col).trim().toLowerCase(), col]));

  const leagueCol = lowerMap.div || lowerMap.league;
  const homeCol = lowerMap.hometeam || lowerMap.home;
  const awayCol = lowerMap.awayteam || lowerMap.away;
  const dateCol = lowerMap.date;

  const missingOdds = ODDS_COLUMNS.filter((col) => !(col in first));
  if (missingOdds.length) throw new Error(`Colonnes Bet365 manquantes : ${missingOdds.join(", ")}`);
  const missingRequired = [
    ["Home", homeCol],
    ["Away", awayCol],
    ["FTHG", "FTHG" in first ? "FTHG" : null],
    ["FTAG", "FTAG" in first ? "FTAG" : null],
    ["HTHG", "HTHG" in first ? "HTHG" : null],
    ["HTAG", "HTAG" in first ? "HTAG" : null],
  ].filter(([, col]) => !col);
  if (missingRequired.length) throw new Error(`Colonnes résultats manquantes : ${missingRequired.map(([name]) => name).join(", ")}`);

  rawRows.forEach((row) => {
    const out = {
      Date: dateCol ? row[dateCol] || "" : "",
      Championnat: leagueName(leagueCol ? row[leagueCol] : sourceName),
      Home: row[homeCol],
      Away: row[awayCol],
      O1: toNumber(row.B365H),
      OX: toNumber(row.B365D),
      O2: toNumber(row.B365A),
      FTHG: toNumber(row.FTHG),
      FTAG: toNumber(row.FTAG),
      HTHG: toNumber(row.HTHG),
      HTAG: toNumber(row.HTAG),
    };
    if (["O1", "OX", "O2", "FTHG", "FTAG", "HTHG", "HTAG"].every((col) => Number.isFinite(out[col]))) {
      prepared.push(out);
    }
  });

  return addMissingCalculatedColumns(prepared);
}

function parseCSVText(text) {
  return Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  }).data;
}

async function readFile(file) {
  const suffix = file.name.split(".").pop().toLowerCase();
  if (suffix === "csv") return parseCSVText(await file.text());
  if (suffix === "xlsx" || suffix === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
  }
  return [];
}

function dedupeRows(rows) {
  const seen = new Set();
  const unique = [];
  rows.forEach((row) => {
    const key = [row.Date, row.Championnat, row.Home, row.Away, row.O1, row.OX, row.O2, row.Score].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  });
  return unique;
}

async function addToBase(newRows) {
  const before = base.length;
  base = dedupeRows(addMissingCalculatedColumns([...base, ...newRows]));
  await saveBase(base);
  updateBaseUI();
  return { before, after: base.length };
}

function pct(rows, field, value) {
  if (!rows.length) return 0;
  return Math.round((rows.filter((row) => row[field] === value).length / rows.length) * 100);
}

function computeSimilar(rows, o1, ox, o2, n) {
  const clean = rows.filter((row) => row.O1 > 1.01 && row.OX > 1.01 && row.O2 > 1.01);
  if (!clean.length) return [];

  const targetRaw = [1 / o1, 1 / ox, 1 / o2];
  const targetSum = targetRaw.reduce((sum, value) => sum + value, 0);
  const targetProb = targetRaw.map((value) => value / targetSum);

  return clean
    .map((row) => {
      const raw = [1 / row.O1, 1 / row.OX, 1 / row.O2];
      const rawSum = raw.reduce((sum, value) => sum + value, 0);
      const probs = raw.map((value) => value / rawSum);
      const distance = Math.sqrt(probs.reduce((sum, value, index) => sum + (value - targetProb[index]) ** 2, 0));
      return { ...row, Distance: distance };
    })
    .filter((row) => Number.isFinite(row.Distance))
    .sort((a, b) => a.Distance - b.Distance)
    .slice(0, Math.min(n, clean.length));
}

function signalStrength(rows) {
  const signals = {
    "+1.5 buts": pct(rows, "Over15", "Oui"),
    "-1.5 buts": pct(rows, "Under15", "Oui"),
    "+2.5 buts": pct(rows, "Over25", "Oui"),
    "-2.5 buts": pct(rows, "Under25", "Oui"),
    "+3.5 buts": pct(rows, "Over35", "Oui"),
    "-3.5 buts": pct(rows, "Under35", "Oui"),
    "BTTS Oui": pct(rows, "BTTS", "Oui"),
    "BTTS Non": pct(rows, "BTTS_Non", "Oui"),
    "Domicile +0.5 but": pct(rows, "Home_Over05", "Oui"),
    "Domicile -0.5 but": pct(rows, "Home_Under05", "Oui"),
    "Extérieur +0.5 but": pct(rows, "Away_Over05", "Oui"),
    "Extérieur -0.5 but": pct(rows, "Away_Under05", "Oui"),
    "Domicile gagne": pct(rows, "Resultat", "1"),
    "Match nul": pct(rows, "Resultat", "N"),
    "Extérieur gagne": pct(rows, "Resultat", "2"),
    "Double chance 1X": pct(rows, "DC_1X", "Oui"),
    "Double chance X2": pct(rows, "DC_X2", "Oui"),
    "Double chance 12": pct(rows, "DC_12", "Oui"),
    "Domicile gagne MT": pct(rows, "HomeWin_MT", "Oui"),
    "Nul à la mi-temps": pct(rows, "Nul_MT", "Oui"),
    "Extérieur gagne MT": pct(rows, "AwayWin_MT", "Oui"),
    "1ère MT plus prolifique": pct(rows, "MT_Prolifique", "1ère MT"),
    "2ème MT plus prolifique": pct(rows, "MT_Prolifique", "2ème MT"),
  };

  const excluded = new Set(["Domicile +0.5 but", "Extérieur +0.5 but", "Double chance 1X", "Double chance X2", "Double chance 12"]);
  const candidates = Object.entries(signals).filter(([name]) => !excluded.has(name));
  const [bestName, bestPct] = candidates.reduce((best, current) => (current[1] > best[1] ? current : best), candidates[0]);
  const strongCount = candidates.filter(([, value]) => value >= 65).length;
  return { signals, bestName, bestPct, strongCount };
}

function confidenceLabel(sampleSize, bestPct, strongCount, baseCount) {
  let score = 0;
  if (sampleSize >= 80) score += 2;
  else if (sampleSize >= 40) score += 1;
  if (bestPct >= 75) score += 2;
  else if (bestPct >= 65) score += 1;
  if (strongCount >= 3) score += 2;
  else if (strongCount >= 2) score += 1;
  if (baseCount >= 1000) score += 1;
  if (score >= 6) return "ÉLEVÉE";
  if (score >= 4) return "MOYENNE";
  return "FAIBLE";
}

function chooseBestSample(rows, o1, ox, o2) {
  const maxN = Math.min(300, rows.length);
  const minN = rows.length >= 20 ? 20 : rows.length;
  if (!minN) return null;

  let best = null;
  for (let n = minN; n <= maxN; n += 5) {
    const sample = computeSimilar(rows, o1, ox, o2, n);
    if (!sample.length) continue;
    const info = signalStrength(sample);
    let score = Math.min(n / 100, 1) * 35;
    score += Math.max(info.bestPct - 50, 0) * 1.4;
    score += info.strongCount * 8;
    if (n > 180) score -= (n - 180) * 0.05;
    if (!best || score > best.score) best = { score, n, sample, ...info };
  }
  if (!best) return null;
  return {
    ...best,
    confidence: confidenceLabel(best.n, best.bestPct, best.strongCount, rows.length),
  };
}

function proposalsByOdds(signals) {
  const groups = {
    "1.30": { "+1.5 buts": signals["+1.5 buts"], "-3.5 buts": signals["-3.5 buts"] },
    "1.70": {
      "BTTS Oui": signals["BTTS Oui"],
      "BTTS Non": signals["BTTS Non"],
      "+2.5 buts": signals["+2.5 buts"],
      "-2.5 buts": signals["-2.5 buts"],
      "Domicile -0.5 but": signals["Domicile -0.5 but"],
      "Extérieur -0.5 but": signals["Extérieur -0.5 but"],
    },
    "2.00": {
      "Nul à la mi-temps": signals["Nul à la mi-temps"],
      "Domicile gagne MT": signals["Domicile gagne MT"],
      "Extérieur gagne MT": signals["Extérieur gagne MT"],
      "1ère MT plus prolifique": signals["1ère MT plus prolifique"],
      "2ème MT plus prolifique": signals["2ème MT plus prolifique"],
    },
    "3.00": {
      "Match nul": signals["Match nul"],
      "1ère MT plus prolifique": signals["1ère MT plus prolifique"],
      "+3.5 buts": signals["+3.5 buts"],
    },
  };

  return Object.fromEntries(
    Object.entries(groups).map(([odds, choices]) => {
      const best = Object.entries(choices).reduce((winner, current) => (current[1] > winner[1] ? current : winner));
      return [odds, best];
    }),
  );
}

function countsBy(rows, field, limit = 10) {
  const counts = new Map();
  rows.forEach((row) => counts.set(row[field], (counts.get(row[field]) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderList(container, rows) {
  container.innerHTML = `<div class="signal-list">${rows
    .map(([name, value]) => `<div class="line-item"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)} %</strong></div>`)
    .join("")}</div>`;
}

function renderScores(container, rows) {
  container.innerHTML = `<div class="score-list">${rows
    .map(([score, count]) => `<div class="line-item"><span>${escapeHtml(score)}</span><strong>${count} fois</strong></div>`)
    .join("")}</div>`;
}

function renderTable(container, rows) {
  const cols = [
    "Date",
    "Championnat",
    "Home",
    "Away",
    "O1",
    "OX",
    "O2",
    "Score",
    "Score_MT",
    "Resultat",
    "Over15",
    "Under15",
    "Over25",
    "Under25",
    "Over35",
    "Under35",
    "BTTS",
    "BTTS_Non",
    "Home_Over05",
    "Away_Over05",
    "DC_1X",
    "DC_X2",
    "DC_12",
    "Nul_MT",
    "HomeWin_MT",
    "AwayWin_MT",
    "MT_Prolifique",
    "Distance",
  ];
  container.innerHTML = `<table><thead><tr>${cols.map((col) => `<th>${col}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${cols.map((col) => `<td>${escapeHtml(col === "Distance" ? row[col].toFixed(4) : row[col])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function renderHistorySearchResults(rows) {
  const container = $("historySearchResults");
  const count = $("searchResultCount");
  const visibleRows = rows.slice(0, 100);
  count.textContent = `${rows.length.toLocaleString("fr-FR")} résultat${rows.length > 1 ? "s" : ""}`;

  if (!base.length) {
    container.innerHTML = `<p class="empty-inline">La base Supabase est en cours de chargement.</p>`;
    return;
  }

  if (!visibleRows.length) {
    container.innerHTML = `<p class="empty-inline">Aucun match trouvé.</p>`;
    return;
  }

  const cols = ["Date", "Season", "Championnat", "Home", "Away", "O1", "OX", "O2", "Score", "Score_MT", "Resultat"];
  container.innerHTML = `
    <table>
      <thead>
        <tr>${cols.map((col) => `<th>${col === "Season" ? "Saison" : col}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${visibleRows
          .map((row) => `<tr>${cols.map((col) => `<td>${escapeHtml(row[col])}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
    ${rows.length > visibleRows.length ? `<p class="table-note">Affichage limité aux 100 premiers résultats.</p>` : ""}
  `;
}

function percentage(rows, field, value) {
  if (!rows.length) return 0;
  return Math.round((rows.filter((row) => row[field] === value).length / rows.length) * 100);
}

function renderHistoryChart(rows) {
  const container = $("historySearchChart");
  if (!base.length) {
    container.innerHTML = "";
    return;
  }

  const stats = [
    ["Domicile gagne", percentage(rows, "Resultat", "1")],
    ["Match nul", percentage(rows, "Resultat", "N")],
    ["Extérieur gagne", percentage(rows, "Resultat", "2")],
    ["+2.5 buts", percentage(rows, "Over25", "Oui")],
    ["-2.5 buts", percentage(rows, "Under25", "Oui")],
    ["BTTS Oui", percentage(rows, "BTTS", "Oui")],
  ];

  container.innerHTML = `
    <div class="chart-head">
      <strong>Résumé des matchs trouvés</strong>
      <span>${rows.length.toLocaleString("fr-FR")} match${rows.length > 1 ? "s" : ""}</span>
    </div>
    <div class="bar-list">
      ${stats
        .map(
          ([label, value]) => `
            <div class="bar-row">
              <span>${escapeHtml(label)}</span>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${value}%"></div>
              </div>
              <strong>${value} %</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function updateHistorySearchFilters() {
  const leagues = ["Tous", ...new Set(base.map((row) => row.Championnat).filter(Boolean).sort())];
  const seasons = ["Toutes", ...new Set(base.map((row) => row.Season).filter(Boolean).sort().reverse())];
  const currentLeague = $("historySearchLeague").value || "Tous";
  const currentSeason = $("historySearchSeason").value || "Toutes";

  $("historySearchLeague").innerHTML = leagues.map((name) => `<option>${escapeHtml(name)}</option>`).join("");
  $("historySearchSeason").innerHTML = seasons.map((season) => `<option>${escapeHtml(season)}</option>`).join("");
  $("historySearchLeague").value = leagues.includes(currentLeague) ? currentLeague : "Tous";
  $("historySearchSeason").value = seasons.includes(currentSeason) ? currentSeason : "Toutes";
}

function runHistorySearch() {
  const team = $("historySearchTeam").value.trim().toLowerCase();
  const league = $("historySearchLeague").value || "Tous";
  const season = $("historySearchSeason").value || "Toutes";
  const result = $("historySearchResult").value || "Tous";

  let rows = base;
  if (team) {
    rows = rows.filter((row) => row.Home.toLowerCase().includes(team) || row.Away.toLowerCase().includes(team));
  }
  if (league !== "Tous") {
    rows = rows.filter((row) => row.Championnat === league);
  }
  if (season !== "Toutes") {
    rows = rows.filter((row) => row.Season === season);
  }
  if (result !== "Tous") {
    rows = rows.filter((row) => row.Resultat === result);
  }

  rows = rows.slice().sort((a, b) => String(b.Date).localeCompare(String(a.Date)));
  renderHistoryChart(rows);
  renderHistorySearchResults(rows);
}

function updateBaseUI() {
  $("matchCount").textContent = base.length.toLocaleString("fr-FR");
  $("historyMatchCount").textContent = base.length.toLocaleString("fr-FR");
  const champs = ["Tous", ...new Set(base.map((row) => row.Championnat).filter(Boolean).sort())];
  $("championshipFilter").innerHTML = champs.map((name) => `<option>${escapeHtml(name)}</option>`).join("");
  $("historyLeagueCount").textContent = Math.max(champs.length - 1, 0).toLocaleString("fr-FR");
  $("historyLeagues").innerHTML =
    champs.length > 1
      ? champs
          .slice(1)
          .map((name) => {
            const count = base.filter((row) => row.Championnat === name).length;
            return `<div class="line-item"><span>${escapeHtml(name)}</span><strong>${count.toLocaleString("fr-FR")}</strong></div>`;
          })
          .join("")
      : `<div class="line-item"><span>Aucune donnée chargée</span><strong>0</strong></div>`;
  updateHistorySearchFilters();
  runHistorySearch();
  runAnalysis();
  renderCalculations();
}

function runAnalysis() {
  const empty = $("emptyState");
  const results = $("results");
  if (!base.length) {
    empty.classList.remove("hidden");
    results.classList.add("hidden");
    return;
  }

  const championship = $("championshipFilter").value || "Tous";
  const rows = championship === "Tous" ? base : base.filter((row) => row.Championnat === championship);
  const o1 = toNumber($("o1").value);
  const ox = toNumber($("ox").value);
  const o2 = toNumber($("o2").value);
  const best = chooseBestSample(rows, o1, ox, o2);

  if (!best) {
    empty.textContent = "Analyse impossible avec ces cotes.";
    empty.classList.remove("hidden");
    results.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  results.classList.remove("hidden");

  const scoreCounts = countsBy(best.sample, "Score", 10);
  const [exactScore, exactCount] = scoreCounts[0] || ["-", 0];
  $("baseUsed").textContent = rows.length.toLocaleString("fr-FR");
  $("sampleUsed").textContent = best.sample.length.toLocaleString("fr-FR");
  $("confidence").textContent = best.confidence;
  $("bestSignal").textContent = `${best.bestName} (${best.bestPct} %)`;
  $("exactScore").textContent = `${exactScore} (${exactCount} fois)`;

  const proposals = proposalsByOdds(best.signals);
  $("proposals").innerHTML = Object.entries(proposals)
    .map(([odds, [name, value]]) => `<article class="proposal"><span>Cote ${odds}</span><strong>${escapeHtml(name)}</strong><small>${value} %</small></article>`)
    .join("");

  renderList($("signalsTab"), Object.entries(best.signals));
  renderScores($("scoresTab"), scoreCounts);
  renderTable($("matchesTab"), best.sample);
  renderCalculations();
}

function renderCalculations() {
  const o1 = toNumber($("o1").value);
  const ox = toNumber($("ox").value);
  const o2 = toNumber($("o2").value);
  const container = $("calculationSummary");

  if (![o1, ox, o2].every((value) => Number.isFinite(value) && value > 1)) {
    container.innerHTML = `<article class="calc-card"><span>Erreur</span><strong>Cotes invalides</strong></article>`;
    return;
  }

  const raw = [
    ["Domicile 1", 1 / o1],
    ["Nul N", 1 / ox],
    ["Extérieur 2", 1 / o2],
  ];
  const total = raw.reduce((sum, [, value]) => sum + value, 0);
  const margin = total - 1;
  const normalized = raw.map(([name, value]) => [name, value / total]);

  container.innerHTML = `
    <article class="calc-card">
      <span>Probabilité brute domicile</span>
      <strong>${(raw[0][1] * 100).toFixed(1)} %</strong>
    </article>
    <article class="calc-card">
      <span>Probabilité brute nul</span>
      <strong>${(raw[1][1] * 100).toFixed(1)} %</strong>
    </article>
    <article class="calc-card">
      <span>Probabilité brute extérieur</span>
      <strong>${(raw[2][1] * 100).toFixed(1)} %</strong>
    </article>
    <article class="calc-card">
      <span>Marge incluse</span>
      <strong>${(margin * 100).toFixed(1)} %</strong>
    </article>
    ${normalized
      .map(
        ([name, value]) => `
          <article class="calc-card">
            <span>${escapeHtml(name)} normalisé</span>
            <strong>${(value * 100).toFixed(1)} %</strong>
          </article>
        `,
      )
      .join("")}
  `;
}

async function downloadSeason(leagueLabel, season) {
  const code = LEAGUES[leagueLabel];
  const response = await fetch(`/api/football-data?league=${encodeURIComponent(code)}&season=${encodeURIComponent(season)}`);
  if (!response.ok) throw new Error(`${code}_${season}`);
  const csv = await response.text();
  return prepareData(parseCSVText(csv), code);
}

async function importFiles() {
  const files = [...$("fileInput").files];
  if (!files.length) {
    $("status").textContent = "Choisis au moins un fichier.";
    return;
  }
  const parts = [];
  const errors = [];
  $("status").textContent = "Import en cours...";
  for (const file of files) {
    try {
      parts.push(...prepareData(await readFile(file), file.name.replace(/\.[^.]+$/, "")));
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }
  if (parts.length) {
    const { before, after } = await addToBase(parts);
    $("status").textContent = `Import terminé : ${before} -> ${after} matchs. ${errors.length ? `${errors.length} fichier(s) ignoré(s).` : ""}`;
  } else {
    $("status").textContent = errors[0] || "Aucun fichier compatible.";
  }
}

async function downloadSelected() {
  const league = $("downloadLeague").value;
  const seasons = $("downloadSeasons").value.split(",").map((season) => season.trim()).filter(Boolean);
  const parts = [];
  const errors = [];
  $("status").textContent = "Téléchargement en cours...";
  for (const season of seasons) {
    try {
      $("status").textContent = `Téléchargement ${league} ${season}...`;
      parts.push(...(await downloadSeason(league, season)));
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (parts.length) {
    const { before, after } = await addToBase(parts);
    $("status").textContent = `Téléchargement terminé : ${before} -> ${after} matchs. ${errors.length ? `${errors.length} saison(s) ignorée(s).` : ""}`;
  } else {
    $("status").textContent = "Aucune donnée téléchargée.";
  }
}

async function downloadPack() {
  const parts = [];
  const errors = [];
  const leagues = Object.keys(LEAGUES);
  let done = 0;
  for (const league of leagues) {
    for (const season of SEASONS_10_YEARS) {
      try {
        $("status").textContent = `Pack 10 ans : ${++done}/${leagues.length * SEASONS_10_YEARS.length} - ${league} ${season}`;
        parts.push(...(await downloadSeason(league, season)));
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  if (parts.length) {
    const { before, after } = await addToBase(parts);
    $("status").textContent = `Pack terminé : ${before} -> ${after} matchs. ${errors.length ? `${errors.length} fichier(s) ignoré(s).` : ""}`;
  } else {
    $("status").textContent = "Aucune donnée téléchargée.";
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      ["signals", "scores", "matches"].forEach((name) => $(`${name}Tab`).classList.toggle("hidden", name !== button.dataset.tab));
    });
  });
}

function setupMainMenu() {
  document.querySelectorAll(".menu-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".menu-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      ["historique", "simulation", "calcul"].forEach((view) => {
        $(`${view}View`).classList.toggle("hidden", view !== button.dataset.view);
      });
      if (button.dataset.view === "calcul") renderCalculations();
    });
  });
}

async function init() {
  $("reloadBaseBtn").addEventListener("click", loadBaseFromSupabase);
  ["championshipFilter", "o1", "ox", "o2"].forEach((id) =>
    $(id).addEventListener("input", () => {
      runAnalysis();
      renderCalculations();
    }),
  );
  ["historySearchTeam", "historySearchLeague", "historySearchSeason", "historySearchResult"].forEach((id) =>
    $(id).addEventListener("input", runHistorySearch),
  );
  setupTabs();
  setupMainMenu();
  updateBaseUI();
  await loadBaseFromSupabase();
}

init().catch((error) => {
  $("status").textContent = `Erreur : ${error.message}`;
});
