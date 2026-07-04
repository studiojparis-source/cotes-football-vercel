import os
from pathlib import Path

import psycopg


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_FILE = ROOT / "supabase" / "schema.sql"
MATCHES_CSV = ROOT / "data" / "supabase_seed_matches.csv"
IMPORTS_CSV = ROOT / "data" / "supabase_seed_imports.csv"

MATCH_COLUMNS = [
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
    "source",
]

IMPORT_COLUMNS = ["source", "championnat", "season", "rows_imported"]


def env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Variable manquante: {name}")
    return value


def copy_csv(cursor, table, columns, csv_file):
    column_sql = ", ".join(columns)
    with cursor.copy(f"copy public.{table} ({column_sql}) from stdin with (format csv, header true)") as copy:
        with csv_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                copy.write(line)


def main():
    host = env("SUPABASE_DB_HOST")
    password = env("SUPABASE_DB_PASSWORD")

    conninfo = (
        f"host={host} "
        "port=5432 "
        "dbname=postgres "
        "user=postgres "
        f"password={password} "
        "sslmode=require"
    )

    with psycopg.connect(conninfo) as conn:
      with conn.cursor() as cur:
          cur.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
          cur.execute("truncate table public.matches restart identity cascade")
          cur.execute("truncate table public.imports restart identity cascade")
          copy_csv(cur, "matches", MATCH_COLUMNS, MATCHES_CSV)
          copy_csv(cur, "imports", IMPORT_COLUMNS, IMPORTS_CSV)
          cur.execute("select count(*) from public.matches")
          match_count = cur.fetchone()[0]
          cur.execute("select count(*) from public.imports")
          import_count = cur.fetchone()[0]
      conn.commit()

    print(f"Chargement terminé: {match_count} matchs, {import_count} imports")


if __name__ == "__main__":
    main()
