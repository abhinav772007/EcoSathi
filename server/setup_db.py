"""Apply supabase/schema.sql using DATABASE_URL."""
from __future__ import annotations

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local", override=True)

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "supabase" / "schema.sql"


def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit(
            "Set DATABASE_URL in .env.local (Supabase > Project Settings > Database > URI).\n"
            "If the password contains @, encode it as %40."
        )
    sql = SCHEMA.read_text(encoding="utf-8")
    print(f"Applying {SCHEMA} ...")
    with psycopg.connect(database_url, connect_timeout=30) as conn:
        conn.execute(sql)
        conn.commit()
        rows = conn.execute(
            """
            select table_name
            from information_schema.tables
            where table_schema = 'public'
            order by 1
            """
        ).fetchall()
    print("Public tables:", ", ".join(name for (name,) in rows))
    print("Schema applied successfully.")


if __name__ == "__main__":
    main()
