import hmac
import math
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()
load_dotenv(".env.local", override=True)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY", "")
ELEVENLABS_WEBHOOK_SECRET = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "")
VOICE_AGENT_USER_ID = os.getenv("VOICE_AGENT_USER_ID", "")
DEPOT_LAT = float(os.getenv("CAMPUS_DEPOT_LAT", "29.8645"))
DEPOT_LNG = float(os.getenv("CAMPUS_DEPOT_LNG", "77.8960"))
_supabase_ready = bool(
    SUPABASE_URL
    and SUPABASE_SERVICE_ROLE_KEY
    and SUPABASE_URL.startswith("https://")
    and "REPLACE_WITH_" not in SUPABASE_SERVICE_ROLE_KEY
    and not SUPABASE_SERVICE_ROLE_KEY.startswith("your-")
)
supabase: Client | None = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if _supabase_ready else None

app = FastAPI(title="EcoSathi API", version="2.1.0")
app.add_middleware(
    CORSMiddleware,
    # Allow any localhost / 127.0.0.1 port so Vite's port-hopping (5173→5175) never breaks auth
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATUSES = ("Submitted", "Needs review", "Verified", "Assigned", "In Progress", "Resolved", "Rejected")
ROLES = ("resident", "worker", "administrator")
PRIORITY_RANK = {"Low": 1, "Medium": 2, "High": 3, "Urgent": 4}
STATUS_TRANSITIONS = {
    "Submitted": {"Needs review", "Verified", "Rejected"},
    "Needs review": {"Verified", "Rejected"},
    "Verified": {"Assigned", "In Progress", "Resolved", "Rejected"},
    "Assigned": {"In Progress", "Resolved", "Verified", "Rejected"},
    "In Progress": {"Resolved", "Rejected"},
    "Resolved": {"Verified"},
    "Rejected": {"Needs review", "Verified"},
}
CATEGORY_KEYWORDS = {
    "Overflowing bin": ("overflow", "spilling", "full bin", "bin is full", "bin full", "garbage bin", "dustbin"),
    "Scattered waste": ("scattered", "litter", "thrown", "plastic on", "waste around", "dump", "pile"),
    "Missed pickup": ("missed", "not collected", "did not collect", "pickup", "pick up", "collection did not"),
    "Disposal question": ("where", "dispose", "disposal", "recycle", "e-waste", "ewaste", "how do i"),
}
PRIORITY_KEYWORDS = {
    "Urgent": ("urgent", "overflow", "hazard", "biohazard", "sharp", "chemical", "emergency", "spilling"),
    "High": ("large", "scattered", "smell", "many", "broken", "blocked", "mess"),
    "Medium": ("missed", "pickup", "late", "again", "still"),
    "Low": ("question", "where", "information", "label", "sign"),
}


class ReportCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    location: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)
    priority: str = Field(pattern="^(Low|Medium|High|Urgent)$")
    description: str | None = Field(default=None, max_length=2000)
    location_id: int | None = None
    source: str = Field(default="text", pattern="^(text|voice|webhook)$")
    confirmed: bool = False
    idempotency_key: str | None = Field(default=None, max_length=128)


class WebhookReport(ReportCreate):
    confirmed: bool = True
    resident_id: str | None = Field(default=None, max_length=64)


class StatusUpdate(BaseModel):
    status: str = Field(pattern="^(Submitted|Needs review|Verified|Assigned|In Progress|Resolved|Rejected)$")
    note: str | None = Field(default=None, max_length=500)


class DuplicateReview(BaseModel):
    decision: str = Field(default="confirmed", pattern="^(confirmed|dismissed)$")
    note: str | None = Field(default=None, max_length=500)


class VoiceRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class VoiceInterpretRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class PlanRequest(BaseModel):
    report_ids: list[int] | None = None


class StopUpdate(BaseModel):
    worker_status: str = Field(pattern="^(in_progress|completed|skipped)$")
    weight_kg: float | None = Field(default=None, ge=0, le=10000)
    note: str | None = Field(default=None, max_length=500)


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_type: str = Field(default="collection_point", max_length=50)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


def configured() -> Client:
    if not supabase:
        raise HTTPException(
            503,
            "Backend is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "(use the secret/service_role key, then restart the server).",
        )
    return supabase


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def ensure_profile(client: Client, user) -> dict:
    user_id = str(user.id)
    fallback_name = (user.user_metadata or {}).get("full_name") or (user.email or "EcoSathi user").split("@")[0]
    existing = client.table("profiles").select("name,role").eq("id", user_id).limit(1).execute()
    if existing.data:
        return existing.data[0]
    client.table("profiles").upsert({
        "id": user_id,
        "name": fallback_name,
        "role": "resident",
    }).execute()
    return {"name": fallback_name, "role": "resident"}


async def current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    client = configured()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Authentication required.")
    try:
        result = client.auth.get_user(authorization.split(" ", 1)[1])
    except Exception as error:
        raise HTTPException(401, "Invalid or expired session.") from error
    if not result.user:
        raise HTTPException(401, "Invalid or expired session.")
    data = ensure_profile(client, result.user)
    return {"id": str(result.user.id), **data}


async def agent_or_user(
    authorization: Annotated[str | None, Header()] = None,
    x_ecosathi_secret: Annotated[str | None, Header(alias="X-EcoSathi-Secret")] = None,
) -> dict:
    if (
        ELEVENLABS_WEBHOOK_SECRET
        and x_ecosathi_secret
        and hmac.compare_digest(ELEVENLABS_WEBHOOK_SECRET, x_ecosathi_secret)
    ):
        return {"id": None, "name": "ElevenLabs voice agent", "role": "voice_agent"}
    return await current_user(authorization)


def require_role(user: dict, *roles: str) -> None:
    if user["role"] not in roles:
        raise HTTPException(403, f"Requires one of these roles: {', '.join(roles)}.")


def report_query(client: Client):
    return client.table("reports").select(
        "id,code,user_id,location_id,title,location,category,priority,status,description,"
        "source,confirmed,idempotency_key,resolved_at,created_at,updated_at"
    )


def write_audit(
    client: Client,
    user_id: str | None,
    entity_type: str,
    entity_id: str,
    action: str,
    metadata: dict | None = None,
) -> None:
    client.table("audit_events").insert({
        "actor_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "metadata": metadata or {},
    }).execute()


def to_client_report(report: dict) -> dict:
    created = parse_time(report["created_at"])
    minutes = max(0, int((datetime.now(timezone.utc) - created).total_seconds() // 60))
    age = "just now" if minutes < 1 else f"{minutes} min ago" if minutes < 60 else f"{minutes // 60} hr ago"
    color = {
        "Overflowing bin": "coral",
        "Scattered waste": "orange",
        "Missed pickup": "blue",
        "Disposal question": "purple",
    }.get(report.get("category"), "green")
    return {
        **report,
        "id": report["code"],
        "report_id": report["id"],
        "age": age,
        "initials": "YU",
        "color": color,
    }


def enrich_plan(client: Client, plan: dict) -> dict:
    locations = {
        item["id"]: item
        for item in client.table("locations").select("*").execute().data
    }
    reports = {
        item["id"]: item
        for item in client.table("reports").select("id,code,title,category,priority,status,location_id").execute().data
    }
    stops = client.table("collection_stops").select("*").eq("plan_id", plan["id"]).order("sequence").execute().data
    enriched = []
    for stop in stops:
        location = locations.get(stop.get("location_id")) or {}
        report = reports.get(stop.get("report_id")) or {}
        enriched.append({
            **stop,
            "location_name": location.get("name") or report.get("location") or f"Stop {stop['sequence']}",
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "report_code": report.get("code"),
            "title": report.get("title"),
            "category": report.get("category"),
            "priority": report.get("priority"),
            "report_status": report.get("status"),
        })
    enriched.sort(key=lambda item: item["sequence"])
    return {
        **plan,
        "collection_stops": enriched,
        "depot": {"latitude": DEPOT_LAT, "longitude": DEPOT_LNG},
    }


def resolve_agent_user(client: Client, resident_id: str | None) -> dict:
    target_id = resident_id or VOICE_AGENT_USER_ID
    if not target_id:
        admins = client.table("profiles").select("id,name,role").eq("role", "administrator").limit(1).execute().data
        if not admins:
            raise HTTPException(
                503,
                "Set VOICE_AGENT_USER_ID or pass resident_id so voice reports have an owner.",
            )
        return {"id": admins[0]["id"], "name": admins[0]["name"], "role": admins[0]["role"]}
    profile = client.table("profiles").select("id,name,role").eq("id", target_id).limit(1).execute().data
    if not profile:
        try:
            result = client.auth.admin.get_user_by_id(target_id)
        except Exception as error:
            raise HTTPException(404, "Voice report owner was not found.") from error
        if not result.user:
            raise HTTPException(404, "Voice report owner was not found.")
        data = ensure_profile(client, result.user)
        return {"id": str(result.user.id), **data}
    return profile[0]


@app.get("/api/health")
def health() -> dict:
    db_ok = False
    location_count = 0
    if supabase:
        try:
            result = supabase.table("locations").select("id").execute()
            db_ok = True
            location_count = len(result.data or [])
        except Exception:
            db_ok = False
    return {
        "ok": True,
        "service": "ecosathi-api",
        "supabaseConfigured": bool(supabase),
        "databaseConnected": db_ok,
        "locationCount": location_count,
        "voiceAgentConfigured": bool(ELEVENLABS_WEBHOOK_SECRET),
        "version": app.version,
    }


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest) -> dict:
    """Create a confirmed account so the user can sign in immediately (local/dev friendly)."""
    client = configured()
    email = payload.email.strip().lower()
    name = payload.name.strip()
    try:
        created = client.auth.admin.create_user(
            {
                "email": email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"full_name": name},
            }
        )
    except Exception as error:
        message = str(error)
        if "already" in message.lower() or "registered" in message.lower() or "exists" in message.lower():
            raise HTTPException(409, "An account with this email already exists. Please sign in.") from error
        raise HTTPException(400, message or "Could not create account.") from error

    user = created.user
    if not user:
        raise HTTPException(500, "Account was not created.")
    client.table("profiles").upsert({
        "id": str(user.id),
        "name": name,
        "role": "resident",
    }).execute()
    return {
        "ok": True,
        "message": "Account created successfully. You can sign in now.",
        "email": email,
        "name": name,
    }


@app.post("/api/auth/login")
async def login(payload: LoginRequest) -> dict:
    """Sign in using the Supabase anon key via REST API and return the session."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(503, "Auth service not configured.")
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            url,
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": payload.email.strip().lower(), "password": payload.password},
        )
    body = resp.json()
    if resp.status_code >= 400:
        detail = body.get("error_description") or body.get("msg") or body.get("error") or "Invalid credentials."
        raise HTTPException(resp.status_code if resp.status_code < 500 else 400, detail)
    return body


@app.get("/api/me")
def me(user: dict = Depends(current_user)) -> dict:
    return user


@app.get("/api/locations")
def list_locations(_user: dict = Depends(current_user)) -> list[dict]:
    client = configured()
    locations = client.table("locations").select("*").order("name").execute().data
    bins = client.table("bins").select("location_id,waste_type,capacity").execute().data
    summary: dict[int, dict] = {}
    for item in bins:
        entry = summary.setdefault(item["location_id"], {"bins": 0, "capacity": 0, "waste_types": []})
        entry["bins"] += 1
        entry["capacity"] += item.get("capacity") or 0
        entry["waste_types"].append(item.get("waste_type") or "mixed")
    return [{**location, **summary.get(location["id"], {"bins": 0, "capacity": 0, "waste_types": []})} for location in locations]


@app.post("/api/locations", status_code=201)
def create_location(payload: LocationCreate, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator")
    client = configured()
    result = client.table("locations").insert(payload.model_dump()).select("*").single().execute()
    write_audit(client, user["id"], "location", str(result.data["id"]), "created", {"name": payload.name})
    return result.data


@app.get("/api/bins")
def list_bins(_user: dict = Depends(current_user)) -> list[dict]:
    return configured().table("bins").select("*,location:locations(name,location_type)").order("location_id").execute().data


@app.get("/api/reports")
def list_reports(user: dict = Depends(current_user)) -> list[dict]:
    query = report_query(configured())
    if user["role"] == "resident":
        query = query.eq("user_id", user["id"])
    result = query.order("created_at", desc=True).execute()
    return [to_client_report(report) for report in result.data]


def create_report_record(client: Client, payload: ReportCreate, user: dict) -> dict:
    if not payload.confirmed:
        raise HTTPException(400, "Report confirmation is required before submission.")
    if user["role"] == "voice_agent" and not payload.source == "voice":
        raise HTTPException(400, "Agent-created reports must use the voice source.")
    if payload.idempotency_key:
        previous = client.table("reports").select("*").eq("idempotency_key", payload.idempotency_key).limit(1).execute()
        if previous.data:
            return to_client_report(previous.data[0])
    fields = payload.model_dump(exclude_none=True)
    fields.pop("resident_id", None)
    record = {
        "code": f"ECO-{uuid.uuid4().hex[:8].upper()}",
        "user_id": user["id"],
        **fields,
        "status": "Submitted",
    }
    result = client.table("reports").insert(record).select("*").single().execute()
    write_audit(client, user["id"], "report", str(result.data["id"]), "created", {"source": payload.source})
    process_report_workflow(client, result.data, user["id"])
    refreshed = report_query(client).eq("id", result.data["id"]).single().execute()
    return to_client_report(refreshed.data or result.data)


@app.post("/api/reports", status_code=201)
def create_report(payload: ReportCreate, user: dict = Depends(current_user)) -> dict:
    return create_report_record(configured(), payload, user)


@app.post("/api/webhooks/elevenlabs/create_waste_report", status_code=201)
def create_waste_report(payload: WebhookReport, user: dict = Depends(agent_or_user)) -> dict:
    """Protected ElevenLabs tool: only creates a report after voice confirmation.

    The agent can authenticate with a Supabase session token or with the
    shared X-EcoSathi-Secret header. Pass resident_id to attribute the report.
    """
    client = configured()
    if user["role"] == "voice_agent":
        payload.source = "voice"
        agent_user = resolve_agent_user(client, payload.resident_id)
    else:
        agent_user = user
    return create_report_record(client, payload, agent_user)


@app.get("/api/reports/{code}")
def get_report(code: str, user: dict = Depends(current_user)) -> dict:
    query = report_query(configured()).eq("code", code)
    if user["role"] == "resident":
        query = query.eq("user_id", user["id"])
    result = query.limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Report not found.")
    return to_client_report(result.data[0])


@app.get("/api/reports/{code}/timeline")
def get_report_timeline(code: str, user: dict = Depends(current_user)) -> dict:
    client = configured()
    query = report_query(client).eq("code", code)
    if user["role"] == "resident":
        query = query.eq("user_id", user["id"])
    result = query.limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Report not found.")
    report = result.data[0]
    events = client.table("audit_events").select("*").eq(
        "entity_type", "report"
    ).eq("entity_id", str(report["id"])).order("created_at", desc=True).execute().data
    links = client.table("report_links").select("*").eq("report_id", report["id"]).execute().data
    canonical = client.table("report_links").select("*").eq("canonical_report_id", report["id"]).execute().data
    return {"report": to_client_report(report), "events": events, "duplicate_links": links, "duplicates_of_me": canonical}


@app.get("/api/webhooks/elevenlabs/get_report_status/{code}")
def get_report_status(code: str, user: dict = Depends(agent_or_user)) -> dict:
    client = configured()
    query = report_query(client).eq("code", code)
    if user["role"] == "resident":
        query = query.eq("user_id", user["id"])
    result = query.limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Report not found.")
    report = result.data[0]
    return {
        "report_id": report["code"],
        "status": report["status"],
        "last_updated": report["updated_at"],
        "location": report["location"],
        "category": report["category"],
    }


@app.patch("/api/reports/{code}")
def update_report_status(code: str, payload: StatusUpdate, user: dict = Depends(current_user)) -> dict:
    client = configured()
    if user["role"] == "resident":
        raise HTTPException(403, "Residents cannot change report status.")
    if user["role"] == "worker" and payload.status not in {"In Progress", "Resolved"}:
        raise HTTPException(403, "Collection workers can only start or complete assigned work.")
    result = report_query(client).eq("code", code)
    current = result.limit(1).execute()
    if not current.data:
        raise HTTPException(404, "Report not found.")
    report = current.data[0]
    if payload.status != report["status"] and payload.status not in STATUS_TRANSITIONS.get(report["status"], set()):
        raise HTTPException(400, f"Cannot move a report from {report['status']} to {payload.status}.")
    changes = {"status": payload.status, "updated_at": now()}
    if payload.note:
        changes["resolution_note"] = payload.note
    if payload.status == "Resolved":
        changes["resolved_at"] = report.get("resolved_at") or now()
    elif report.get("resolved_at"):
        changes["resolved_at"] = None
    updated = client.table("reports").update(changes).eq("id", report["id"]).select("*").single().execute()
    write_audit(
        client,
        user["id"],
        "report",
        str(report["id"]),
        "status_changed",
        {"from": report["status"], "to": payload.status, "note": payload.note},
    )
    return to_client_report(updated.data)


@app.patch("/api/reports/{code}/status")
def update_report_status_explicit(code: str, payload: StatusUpdate, user: dict = Depends(current_user)) -> dict:
    return update_report_status(code, payload, user)


@app.get("/api/duplicates")
def list_duplicates(user: dict = Depends(current_user)) -> list[dict]:
    require_role(user, "administrator", "worker")
    return configured().table("report_links").select(
        "*,report:reports!report_id(id,code,title,location,category,priority,status,created_at),"
        "canonical:reports!canonical_report_id(id,code,title,location,category,priority,status,created_at)"
    ).order("created_at", desc=True).execute().data


@app.post("/api/duplicates/{link_id}/review")
def review_duplicate(
    link_id: int,
    payload: DuplicateReview | None = None,
    user: dict = Depends(current_user),
) -> dict:
    require_role(user, "administrator")
    client = configured()
    decision = payload.decision if payload else "confirmed"
    links = client.table("report_links").select("*").eq("id", link_id).limit(1).execute().data
    if not links:
        raise HTTPException(404, "Duplicate link not found.")
    link = links[0]
    result = client.table("report_links").update({"reviewed": True}).eq("id", link_id).select("*").single().execute()
    if decision == "confirmed":
        client.table("reports").update({
            "status": "Rejected",
            "resolution_note": (payload.note if payload else None) or "Confirmed duplicate of an existing report.",
            "updated_at": now(),
        }).eq("id", link["report_id"]).execute()
    else:
        client.table("reports").update({
            "status": "Verified",
            "updated_at": now(),
        }).eq("id", link["report_id"]).eq("status", "Needs review").execute()
    write_audit(
        client,
        user["id"],
        "report_link",
        str(link_id),
        "duplicate_reviewed",
        {"decision": decision, "report_id": link["report_id"], "canonical_report_id": link["canonical_report_id"]},
    )
    return {**result.data, "decision": decision}


@app.post("/api/collection-plans/generate")
def generate_plan(payload: PlanRequest, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    client = configured()
    run = client.table("workflow_runs").insert({
        "kind": "route_generation",
        "status": "running",
        "algorithm_version": "priority-nearest-neighbor-v2",
        "started_at": now(),
    }).select("*").single().execute().data
    try:
        query = report_query(client).in_("status", ["Verified", "Assigned"])
        if payload.report_ids:
            query = query.in_("id", payload.report_ids)
        reports = query.execute().data
        locations = {item["id"]: item for item in client.table("locations").select("*").execute().data}
        eligible = [item for item in reports if item.get("location_id") in locations]
        if not eligible:
            raise HTTPException(400, "No verified reports with configured locations are ready for collection.")
        baseline = sorted(eligible, key=lambda item: item["created_at"])
        optimized = nearest_neighbor_route(eligible, locations)
        total_distance = route_distance(optimized, locations)
        baseline_distance = route_distance(baseline, locations)
        client.table("collection_plans").update({"status": "cancelled"}).eq("status", "proposed").execute()
        plan = client.table("collection_plans").insert({
            "status": "proposed",
            "algorithm_version": "priority-nearest-neighbor-v2",
            "created_by": user["id"],
            "total_distance": total_distance,
            "baseline_distance": baseline_distance,
            "stop_count": len(optimized),
            "objective_value": total_distance,
            "depot_lat": DEPOT_LAT,
            "depot_lng": DEPOT_LNG,
        }).select("*").single().execute().data
        stops = [{
            "plan_id": plan["id"],
            "report_id": report["id"],
            "location_id": report.get("location_id"),
            "sequence": index + 1,
        } for index, report in enumerate(optimized)]
        if stops:
            client.table("collection_stops").insert(stops).execute()
            client.table("reports").update({"status": "Assigned", "updated_at": now()}).in_(
                "id", [item["id"] for item in optimized]
            ).execute()
        client.table("workflow_runs").update({
            "status": "succeeded",
            "completed_at": now(),
            "payload": {
                "plan_id": plan["id"],
                "stops": len(stops),
                "total_distance": total_distance,
                "baseline_distance": baseline_distance,
            },
        }).eq("id", run["id"]).execute()
        write_audit(
            client,
            user["id"],
            "collection_plan",
            str(plan["id"]),
            "generated",
            {"stop_count": len(stops), "total_distance": total_distance, "baseline_distance": baseline_distance},
        )
        return enrich_plan(client, plan)
    except HTTPException as error:
        client.table("workflow_runs").update({
            "status": "failed", "error": error.detail, "completed_at": now()
        }).eq("id", run["id"]).execute()
        raise
    except Exception as error:
        client.table("workflow_runs").update({
            "status": "failed", "error": str(error), "completed_at": now()
        }).eq("id", run["id"]).execute()
        raise HTTPException(500, "Route generation failed.") from error


@app.get("/api/collection-plans")
def list_plans(user: dict = Depends(current_user)) -> list[dict]:
    require_role(user, "administrator", "worker")
    client = configured()
    plans = client.table("collection_plans").select("*").order("created_at", desc=True).limit(25).execute().data
    return [enrich_plan(client, plan) for plan in plans]


@app.get("/api/collection-plans/{plan_id}")
def get_plan(plan_id: str, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    client = configured()
    result = client.table("collection_plans").select("*").eq("id", plan_id).limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Collection plan not found.")
    return enrich_plan(client, result.data[0])


@app.patch("/api/collection-stops/{stop_id}")
def update_stop(stop_id: int, payload: StopUpdate, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    client = configured()
    existing = client.table("collection_stops").select("*").eq("id", stop_id).limit(1).execute().data
    if not existing:
        raise HTTPException(404, "Collection stop not found.")
    stop = existing[0]
    changes: dict = {"worker_status": payload.worker_status}
    if payload.worker_status == "in_progress":
        changes["started_at"] = now()
    if payload.worker_status == "completed":
        changes["completed_at"] = now()
        if payload.weight_kg is not None:
            changes["weight_kg"] = payload.weight_kg
    if payload.note:
        changes["notes"] = payload.note
    result = client.table("collection_stops").update(changes).eq("id", stop_id).select("*").single().execute()
    report_changes: dict = {"updated_at": now()}
    if payload.worker_status == "completed":
        report_changes.update({"status": "Resolved", "resolved_at": now()})
    elif payload.worker_status == "in_progress":
        report_changes["status"] = "In Progress"
    else:
        report_changes["status"] = "Verified"
    client.table("reports").update(report_changes).eq("id", stop["report_id"]).execute()
    write_audit(
        client,
        user["id"],
        "report",
        str(stop["report_id"]),
        "status_changed",
        {"to": report_changes["status"], "source": "collection_stop", "stop_id": stop_id},
    )
    if payload.worker_status == "completed":
        remaining = client.table("collection_stops").select("id").eq(
            "plan_id", stop["plan_id"]
        ).neq("worker_status", "completed").execute().data
        if not remaining:
            client.table("collection_plans").update({"status": "completed"}).eq("id", stop["plan_id"]).execute()
    write_audit(
        client,
        user["id"],
        "collection_stop",
        str(stop_id),
        "worker_status_changed",
        {**changes, "report_id": stop["report_id"]},
    )
    return result.data


@app.get("/api/workflows")
def list_workflows(user: dict = Depends(current_user)) -> list[dict]:
    require_role(user, "administrator", "worker")
    return configured().table("workflow_runs").select(
        "*,report:reports!report_id(code,title,status)"
    ).order("created_at", desc=True).limit(100).execute().data


@app.get("/api/audit-events")
def list_audit_events(
    user: dict = Depends(current_user),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[dict]:
    require_role(user, "administrator")
    client = configured()
    events = client.table("audit_events").select("*").order("created_at", desc=True).limit(limit).execute().data
    actor_ids = sorted({event["actor_id"] for event in events if event.get("actor_id")})
    actors = {
        item["id"]: item
        for item in client.table("profiles").select("id,name,role").in_("id", actor_ids).execute().data
    } if actor_ids else {}
    return [{**event, "actor": actors.get(event.get("actor_id"))} for event in events]


@app.get("/api/analytics/summary")
def analytics_summary(user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    client = configured()
    reports = client.table("reports").select(
        "id,status,priority,category,created_at,resolved_at,location_id"
    ).execute().data
    actionable = [item for item in reports if item["status"] != "Rejected"]
    resolved = [item for item in actionable if item.get("resolved_at")]
    times = [
        (parse_time(item["resolved_at"]) - parse_time(item["created_at"])).total_seconds() / 3600
        for item in resolved
    ]
    plans = client.table("collection_plans").select("*").order("created_at", desc=True).limit(1).execute().data
    latest_plan = plans[0] if plans else None
    stops = client.table("collection_stops").select("*").execute().data
    completed_stops = [item for item in stops if item["worker_status"] == "completed"]
    links = client.table("report_links").select("id,reviewed").execute().data
    runs = client.table("workflow_runs").select("status").execute().data
    finished_runs = [item for item in runs if item["status"] in {"succeeded", "failed"}]

    now_day = datetime.now(timezone.utc).date()
    series = []
    for offset in range(6, -1, -1):
        day = now_day - timedelta(days=offset)
        label = day.strftime("%a")
        series.append({
            "day": label,
            "date": day.isoformat(),
            "reports": sum(parse_time(item["created_at"]).date() == day for item in reports),
            "resolved": sum(parse_time(item["resolved_at"]).date() == day for item in resolved),
        })

    category_counts: dict[str, int] = {}
    for item in reports:
        category_counts[item["category"]] = category_counts.get(item["category"], 0) + 1

    distance_saved = 0.0
    if latest_plan:
        distance_saved = max(0.0, (latest_plan.get("baseline_distance") or 0) - (latest_plan.get("total_distance") or 0))

    return {
        "total_reports": len(reports),
        "actionable_reports": len(actionable),
        "resolved_reports": len(resolved),
        "rejected_reports": len(reports) - len(actionable),
        "open_reports": sum(item["status"] not in {"Resolved", "Rejected"} for item in reports),
        "resolution_rate": round(len(resolved) / len(actionable), 3) if actionable else 0,
        "median_resolution_hours": round(sorted(times)[len(times) // 2], 2) if times else None,
        "duplicate_links": len(links),
        "pending_duplicates": sum(not item["reviewed"] for item in links),
        "workflow_runs": len(runs),
        "workflow_completion_rate": round(
            sum(item["status"] == "succeeded" for item in finished_runs) / len(finished_runs), 3
        ) if finished_runs else 0,
        "collection_stops": len(stops),
        "completed_stops": len(completed_stops),
        "waste_recovered_kg": round(sum(item.get("weight_kg") or 0 for item in completed_stops), 2),
        "route_distance_saved_km": round(distance_saved, 2),
        "route_distance_saved_pct": round(
            (distance_saved / latest_plan["baseline_distance"]) * 100, 1
        ) if latest_plan and latest_plan.get("baseline_distance") else 0,
        "last_plan": {
            "id": latest_plan["id"],
            "status": latest_plan["status"],
            "total_distance": latest_plan.get("total_distance"),
            "baseline_distance": latest_plan.get("baseline_distance"),
            "stop_count": latest_plan.get("stop_count"),
        } if latest_plan else None,
        "last_7_days": series,
        "category_breakdown": [
            {"name": name, "count": count}
            for name, count in sorted(category_counts.items(), key=lambda item: item[1], reverse=True)
        ],
        "demo_data": True,
        "data_note": "Seeded campus demonstration data. Replace with operator-verified records before claiming real impact.",
    }


def process_report_workflow(client: Client, report: dict, actor_id: str) -> None:
    run = client.table("workflow_runs").insert({
        "kind": "report_processing",
        "report_id": report["id"],
        "status": "running",
        "algorithm_version": "triage-duplicate-v2",
        "started_at": now(),
    }).select("*").single().execute().data
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        duplicate_query = client.table("reports").select("id,code,title,status").eq(
            "category", report["category"]
        ).neq("id", report["id"]).in_("status", ["Submitted", "Needs review", "Verified", "Assigned"]).gte(
            "created_at", cutoff.isoformat()
        )
        if report.get("location_id"):
            duplicate_query = duplicate_query.eq("location_id", report["location_id"])
        else:
            duplicate_query = duplicate_query.eq("location", report["location"])
        candidates = duplicate_query.order("created_at").execute().data
        link_created = False
        if candidates:
            candidate = candidates[0]
            known_link = client.table("report_links").select("canonical_report_id").eq(
                "report_id", candidate["id"]
            ).limit(1).execute().data
            canonical_id = known_link[0]["canonical_report_id"] if known_link else candidate["id"]
            client.table("report_links").upsert({
                "report_id": report["id"],
                "canonical_report_id": canonical_id,
                "match_reason": "Same configured location and category within the 24-hour review window",
                "confidence": 0.75,
                "reviewed": False,
            }, on_conflict="report_id,canonical_report_id").execute()
            link_created = True
        next_status = "Needs review" if link_created else "Verified"
        client.table("reports").update({"status": next_status, "updated_at": now()}).eq(
            "id", report["id"]
        ).execute()
        client.table("workflow_runs").update({
            "status": "succeeded",
            "completed_at": now(),
            "payload": {
                "duplicate_candidates": len(candidates),
                "duplicate_link_created": link_created,
                "assigned_status": next_status,
            },
        }).eq("id", run["id"]).execute()
    except Exception as error:
        client.table("workflow_runs").update({
            "status": "failed",
            "error": str(error),
            "completed_at": now(),
        }).eq("id", run["id"]).execute()


@app.post("/api/voice/interpret")
def interpret_voice(payload: VoiceInterpretRequest, _user: dict = Depends(current_user)) -> dict:
    """Browser speech fallback: turn a transcript into an editable structured draft."""
    client = configured()
    text = payload.text.strip()
    lowered = text.lower()
    locations = client.table("locations").select("*").execute().data
    location = None
    best_score = 0
    for item in locations:
        tokens = [token for token in item["name"].lower().replace("·", " ").split() if len(token) > 2]
        score = sum(token in lowered for token in tokens)
        if score > best_score:
            best_score = score
            location = item
    if location is None:
        aliases = {
            "hostel mess": "R. K. Hall",
            "mess": "R. K. Hall",
            "amphitheatre": "Main amphitheatre",
            "library": "Central library",
            "science block": "Science block",
            "rajendra": "Rajendra Bhawan",
        }
        for alias, name_hint in aliases.items():
            if alias in lowered:
                location = next((item for item in locations if name_hint.lower() in item["name"].lower()), None)
                if location:
                    break
    category = None
    for name, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            category = name
            break
    priority = "Medium"
    for name, keywords in PRIORITY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            priority = name
            break
    confidence = 0.4 + (0.25 if location else 0) + (0.2 if category else 0)
    resolved_category = category or "Scattered waste"
    title = text[:120] if text else f"{resolved_category} report"
    return {
        "transcript": text,
        "title": title,
        "description": text,
        "category": resolved_category,
        "priority": priority,
        "location_id": location["id"] if location else None,
        "location": location["name"] if location else None,
        "confidence": round(min(confidence, 0.95), 2),
        "needs_confirmation": True,
        "missing_fields": ([] if location else ["location"]),
    }


@app.post("/api/voice/synthesize")
async def synthesize_voice(payload: VoiceRequest, _user: dict = Depends(current_user)) -> Response:
    api_key, voice_id = os.getenv("ELEVENLABS_API_KEY"), os.getenv("ELEVENLABS_VOICE_ID")
    if not api_key or not voice_id:
        raise HTTPException(503, "ElevenLabs is not configured.")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={"text": payload.text, "model_id": "eleven_multilingual_v2", "output_format": "mp3_44100_128"},
        )
    if response.status_code >= 400:
        raise HTTPException(response.status_code, "ElevenLabs synthesis failed.")
    return Response(content=response.content, media_type="audio/mpeg")


def priority_score(report: dict) -> int:
    return PRIORITY_RANK.get(report.get("priority"), 1)


def haversine_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [first[1], first[0], second[1], second[0]])
    delta_lon = lon2 - lon1
    delta_lat = lat2 - lat1
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def location_point(location: dict) -> tuple[float, float]:
    return float(location["latitude"]), float(location["longitude"])


def nearest_neighbor_route(reports: list[dict], locations: dict) -> list[dict]:
    """Nearest-neighbour ordering with a small priority bonus so urgent work is not deferred."""
    remaining = list(reports)
    ordered = []
    current = (DEPOT_LAT, DEPOT_LNG)
    while remaining:
        def score(report: dict) -> float:
            point = location_point(locations[report["location_id"]])
            distance = haversine_km(current, point)
            return distance - (0.08 * priority_score(report))

        next_report = min(remaining, key=score)
        ordered.append(next_report)
        current = location_point(locations[next_report["location_id"]])
        remaining.remove(next_report)
    return ordered


def route_distance(reports: list[dict], locations: dict) -> float:
    points = [(DEPOT_LAT, DEPOT_LNG)] + [
        location_point(locations[item["location_id"]])
        for item in reports
        if item.get("location_id") in locations
    ]
    points.append((DEPOT_LAT, DEPOT_LNG))
    return round(
        sum(haversine_km(points[index - 1], points[index]) for index in range(1, len(points))),
        2,
    )
