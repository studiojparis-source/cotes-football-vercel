const ALLOWED_PERIODS = new Set(["today", "week", "all"]);

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dateRange(period) {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (period === "today") {
    return { dateFrom: isoDate(start), dateTo: isoDate(start) };
  }
  if (period === "week") {
    return { dateFrom: isoDate(start), dateTo: isoDate(addDays(start, 7)) };
  }
  return { dateFrom: isoDate(addDays(start, -14)), dateTo: isoDate(addDays(start, 14)) };
}

function normalizeMatch(match) {
  return {
    id: String(match.id),
    utcDate: match.utcDate,
    status: match.status,
    competition: match.competition?.name || "",
    home: match.homeTeam?.name || "",
    away: match.awayTeam?.name || "",
    score: {
      home: match.score?.fullTime?.home,
      away: match.score?.fullTime?.away,
    },
  };
}

async function fetchMatches({ token, dateFrom, dateTo, status }) {
  const params = new URLSearchParams({ dateFrom, dateTo, status });
  const response = await fetch(`https://api.football-data.org/v4/matches?${params.toString()}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Football-data ${response.status}`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  const payload = await response.json();
  return payload.matches || [];
}

module.exports = async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    res.status(200).json({
      configured: false,
      error: "FOOTBALL_DATA_TOKEN n'est pas configuré dans Vercel.",
      matches: [],
    });
    return;
  }

  const period = ALLOWED_PERIODS.has(String(req.query.period)) ? String(req.query.period) : "week";
  const status = String(req.query.status || "SCHEDULED");
  const allowedStatuses = new Set(["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED"]);
  const statuses = status
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => allowedStatuses.has(item));
  const { dateFrom, dateTo } = dateRange(period);

  try {
    const matchesByStatus = await Promise.all(
      (statuses.length ? statuses : ["SCHEDULED"]).map((singleStatus) =>
        fetchMatches({ token, dateFrom, dateTo, status: singleStatus }),
      ),
    );
    const matches = matchesByStatus.flat();
    const uniqueMatches = [...new Map(matches.map((match) => [match.id, match])).values()];
    res.setHeader("cache-control", "s-maxage=300, stale-while-revalidate=900");
    res.status(200).json({
      configured: true,
      dateFrom,
      dateTo,
      matches: uniqueMatches.map(normalizeMatch),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      configured: true,
      error: error.message,
      detail: error.detail || "",
      matches: [],
    });
  }
};
