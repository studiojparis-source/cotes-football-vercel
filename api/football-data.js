module.exports = async function handler(req, res) {
  const { league, season } = req.query;

  if (!league || !season) {
    res.status(400).json({ error: "Paramètres manquants." });
    return;
  }

  if (!/^[A-Z0-9]+$/.test(String(league)) || !/^[0-9]{4}$/.test(String(season))) {
    res.status(400).json({ error: "Paramètres invalides." });
    return;
  }

  const url = `https://www.football-data.co.uk/mmz4281/${season}/${league}.csv`;
  const response = await fetch(url);

  if (!response.ok) {
    res.status(response.status).json({ error: `Fichier introuvable: ${league}_${season}` });
    return;
  }

  const csv = await response.text();
  res.setHeader("content-type", "text/csv; charset=latin1");
  res.setHeader("cache-control", "s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).send(csv);
};
