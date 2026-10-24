import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv(".env.local")
load_dotenv()

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
        ("ECO-2001", "Overflowing bin near hostel mess", "R. K. Hall · North gate", "Overflowing bin", "Urgent", "Needs review", "Bin has been full since the morning collection round.", 12),
        ("ECO-2002", "Mixed waste around the amphitheatre", "Main amphitheatre", "Scattered waste", "High", "Verified", "Plastic and food waste need to be separated.", 38),
        ("ECO-2003", "Missed pickup from science block", "Science block · Dock 2", "Missed pickup", "Medium", "Assigned", "The scheduled collection did not arrive at Dock 2.", 75),
        ("ECO-2004", "Where can I dispose of e-waste?", "Rajendra Bhawan", "Disposal question", "Low", "Resolved", "Resident requested the nearest e-waste drop-off point.", 130),
        ("ECO-2005", "Broken recycling label", "Central library", "Disposal question", "Medium", "Needs review", "The recycling instructions are no longer readable.", 185),
        ("ECO-2006", "Hostel mess bin still overflowing", "R. K. Hall · North gate", "Overflowing bin", "High", "Needs review", "Follow-up report for the same full bin; retained for duplicate review.", 16),
    ]
    return [
        {
            "code": code,
            "user_id": user_id,
            "title": title,
            "location": location,
            "category": category,
            "priority": priority,
            "status": status,
            "description": description,
            "created_at": (now - timedelta(minutes=age)).isoformat(),
        }
        for code, title, location, category, priority, status, description, age in reports
    ]


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
