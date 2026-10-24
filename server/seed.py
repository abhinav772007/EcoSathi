import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()
load_dotenv(".env.local", override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DEMO_EMAIL = os.getenv("SEED_USER_EMAIL", "demo@ecosathi.local")
DEMO_PASSWORD = os.getenv("SEED_USER_PASSWORD", "EcoSathiDemo123!")

def get_or_create_demo_user(client: Client) -> str:
    users = client.auth.admin.list_users()
    existing = next((user for user in users if user.email == DEMO_EMAIL), None)
    if existing:
        return str(existing.id)

    result = client.auth.admin.create_user(
        {
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "EcoSathi Demo User"},
        }
    )
    return str(result.user.id)


def build_reports(user_id: str) -> list[dict]:
    now = datetime.now(timezone.utc)
    reports = [
        ("ECO-2001", "Overflowing bin near hostel mess", "R. K. Hall · North gate", "Overflowing bin", "Urgent", "Needs review", "Bin has been full since the morning collection round.", 12, None),
        ("ECO-2002", "Mixed waste around the amphitheatre", "Main amphitheatre", "Scattered waste", "High", "Verified", "Plastic and food waste need to be separated.", 38, None),
        ("ECO-2003", "Missed pickup from science block", "Science block · Dock 2", "Missed pickup", "Medium", "Verified", "The scheduled collection did not arrive at Dock 2.", 75, None),
        ("ECO-2004", "Where can I dispose of e-waste?", "Rajendra Bhawan", "Disposal question", "Low", "Resolved", "Resident requested the nearest e-waste drop-off point.", 130, 55),
        ("ECO-2005", "Broken recycling label", "Central library", "Disposal question", "Medium", "Verified", "The recycling instructions are no longer readable.", 185, None),
        ("ECO-2006", "Hostel mess bin still overflowing", "R. K. Hall · North gate", "Overflowing bin", "High", "Needs review", "Follow-up report for the same full bin; retained for duplicate review.", 16, None),
        ("ECO-2007", "Litter around the library steps", "Central library", "Scattered waste", "High", "Verified", "Paper cups and wrappers are collected near the entrance.", 52, None),
        ("ECO-2008", "Bin outside hospital gate is full", "Institute hospital", "Overflowing bin", "Urgent", "Resolved", "Bin was overflowing beside the outpatient gate.", 240, 70),
        ("ECO-2009", "Where should disposable masks go?", "Sports complex", "Disposal question", "Low", "Verified", "Resident asked which stream is used for used masks.", 8, None),
        ("ECO-2010", "Lecture hall waste not collected", "Lecture Hall Complex", "Missed pickup", "Medium", "Verified", "The afternoon pickup was missed after a large event.", 96, None),
        ("ECO-2011", "Recycling bin full at Rajendra Bhawan", "Rajendra Bhawan", "Overflowing bin", "High", "Verified", "The recyclable stream bin needs an extra pickup.", 64, None),
        ("ECO-2012", "Waste scattered near sports complex", "Sports complex", "Scattered waste", "High", "Verified", "Bottles and food wrappers are spread across the path.", 110, None),
        ("ECO-2013", "Missed pickup outside hospital", "Institute hospital", "Missed pickup", "Medium", "Verified", "The scheduled afternoon pickup did not arrive.", 30, None),
    ]
    rows = []
    for code, title, location, category, priority, status, description, age, resolved_after in reports:
        created_at = now - timedelta(minutes=age)
        row = {
            "code": code,
            "user_id": user_id,
            "title": title,
            "location": location,
            "category": category,
            "priority": priority,
            "status": status,
            "description": description,
            "created_at": created_at.isoformat(),
            "updated_at": created_at.isoformat(),
        }
        if resolved_after is not None:
            row["resolved_at"] = (created_at + timedelta(minutes=resolved_after)).isoformat()
        rows.append(row)
    return rows


def main() -> None:
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.")
    client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    user_id = get_or_create_demo_user(client)
    client.table("profiles").upsert({
        "id": user_id, "name": "EcoSathi Demo Administrator", "role": "administrator",
    }).execute()
    locations = {
        item["name"]: item["id"]
        for item in client.table("locations").select("id,name").execute().data
    }
    reports = build_reports(user_id)
    for report in reports:
        report["location_id"] = locations.get(report["location"])
    result = client.table("reports").upsert(reports, on_conflict="code").execute()
    by_code = {item["code"]: item["id"] for item in result.data}
    if by_code.get("ECO-2001") and by_code.get("ECO-2006"):
        client.table("report_links").upsert({
            "report_id": by_code["ECO-2006"],
            "canonical_report_id": by_code["ECO-2001"],
            "match_reason": "Same configured location and similar issue within 24 hours",
            "confidence": 0.91,
            "reviewed": False,
        }, on_conflict="report_id,canonical_report_id").execute()
    print(f"Seeded {len(result.data)} reports for {DEMO_EMAIL}.")
    print(f"Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
