from pathlib import Path

import numpy as np
import pandas as pd
import requests


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

LEAGUES = {
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
}

SEASONS = ["2526", "2425", "2324", "2223", "2122", "2021", "1920", "1819", "1718", "1617"]


def read_remote_csv(code, season):
    url = f"https://www.football-data.co.uk/mmz4281/{season}/{code}.csv"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    local_file = DATA_DIR / "raw" / f"{code}_{season}.csv"
    local_file.parent.mkdir(exist_ok=True)
    local_file.write_bytes(response.content)
    return pd.read_csv(local_file, encoding="latin1")


def parse_date(series):
    parsed = pd.to_datetime(series, dayfirst=True, errors="coerce")
    return parsed.dt.date


def prepare_data(raw, championnat, code, season):
    data = raw.copy()
    rename_map = {}
    for col in data.columns:
        c = str(col).strip().lower()
        if c == "hometeam":
            rename_map[col] = "Home"
        elif c == "awayteam":
            rename_map[col] = "Away"
    data = data.rename(columns=rename_map)

    required = ["Home", "Away", "FTHG", "FTAG", "HTHG", "HTAG", "B365H", "B365D", "B365A"]
    missing = [col for col in required if col not in data.columns]
    if missing:
        raise ValueError("Colonnes manquantes: " + ", ".join(missing))

    out = pd.DataFrame()
    out["match_date"] = parse_date(data["Date"]) if "Date" in data.columns else pd.NaT
    out["season"] = season
    out["championnat"] = championnat
    out["home"] = data["Home"]
    out["away"] = data["Away"]
    out["o1"] = pd.to_numeric(data["B365H"], errors="coerce")
    out["ox"] = pd.to_numeric(data["B365D"], errors="coerce")
    out["o2"] = pd.to_numeric(data["B365A"], errors="coerce")
    out["fthg"] = pd.to_numeric(data["FTHG"], errors="coerce")
    out["ftag"] = pd.to_numeric(data["FTAG"], errors="coerce")
    out["hthg"] = pd.to_numeric(data["HTHG"], errors="coerce")
    out["htag"] = pd.to_numeric(data["HTAG"], errors="coerce")

    numeric_cols = ["o1", "ox", "o2", "fthg", "ftag", "hthg", "htag"]
    out = out.dropna(subset=numeric_cols).copy()
    out = out[(out["o1"] > 1.01) & (out["ox"] > 1.01) & (out["o2"] > 1.01)].copy()

    for col in ["fthg", "ftag", "hthg", "htag"]:
        out[col] = out[col].astype(int)

    total_goals = out["fthg"] + out["ftag"]
    out["score"] = out["fthg"].astype(str) + "-" + out["ftag"].astype(str)
    out["score_mt"] = out["hthg"].astype(str) + "-" + out["htag"].astype(str)
    out["resultat"] = np.where(out["fthg"] > out["ftag"], "1", np.where(out["fthg"] == out["ftag"], "N", "2"))
    out["over15"] = total_goals >= 2
    out["under15"] = total_goals <= 1
    out["over25"] = total_goals >= 3
    out["under25"] = total_goals <= 2
    out["over35"] = total_goals >= 4
    out["under35"] = total_goals <= 3
    out["btts"] = (out["fthg"] > 0) & (out["ftag"] > 0)
    out["btts_non"] = (out["fthg"] == 0) | (out["ftag"] == 0)
    out["home_over05"] = out["fthg"] >= 1
    out["home_under05"] = out["fthg"] == 0
    out["away_over05"] = out["ftag"] >= 1
    out["away_under05"] = out["ftag"] == 0
    out["dc_1x"] = out["fthg"] >= out["ftag"]
    out["dc_x2"] = out["ftag"] >= out["fthg"]
    out["dc_12"] = out["fthg"] != out["ftag"]
    out["nul_mt"] = out["hthg"] == out["htag"]
    out["homewin_mt"] = out["hthg"] > out["htag"]
    out["awaywin_mt"] = out["hthg"] < out["htag"]
    out["buts_1mt"] = out["hthg"] + out["htag"]
    out["buts_2mt"] = total_goals - out["buts_1mt"]
    out["mt_prolifique"] = np.where(
        out["buts_1mt"] > out["buts_2mt"],
        "1ère MT",
        np.where(out["buts_2mt"] > out["buts_1mt"], "2ème MT", "Égalité"),
    )
    out["source"] = "football-data.co.uk"
    return out


def main():
    parts = []
    imports = []
    errors = []

    for championnat, code in LEAGUES.items():
        for season in SEASONS:
            try:
                raw = read_remote_csv(code, season)
                prepared = prepare_data(raw, championnat, code, season)
                if not prepared.empty:
                    parts.append(prepared)
                imports.append(
                    {
                        "source": "football-data.co.uk",
                        "championnat": championnat,
                        "season": season,
                        "rows_imported": len(prepared),
                    }
                )
                print(f"OK {code}_{season}: {len(prepared)} matchs")
            except Exception as exc:
                errors.append(f"{code}_{season}: {exc}")
                print(f"IGNORÉ {code}_{season}: {exc}")

    if not parts:
        raise SystemExit("Aucune donnée récupérée.")

    matches = pd.concat(parts, ignore_index=True)
    matches = matches.drop_duplicates(
        subset=["match_date", "championnat", "home", "away", "o1", "ox", "o2", "score"],
        keep="first",
    ).reset_index(drop=True)

    matches.to_csv(DATA_DIR / "supabase_seed_matches.csv", index=False)
    pd.DataFrame(imports).to_csv(DATA_DIR / "supabase_seed_imports.csv", index=False)

    if errors:
        (DATA_DIR / "supabase_seed_errors.txt").write_text("\n".join(errors), encoding="utf-8")

    print(f"\nBase générée: {len(matches)} matchs")
    print(f"Fichier: {DATA_DIR / 'supabase_seed_matches.csv'}")
    print(f"Imports: {DATA_DIR / 'supabase_seed_imports.csv'}")
    print(f"Erreurs: {len(errors)}")


if __name__ == "__main__":
    main()
