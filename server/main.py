import math
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()
load_dotenv(".env.local", override=True)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY", "")
_supabase_ready = bool(
    SUPABASE_URL
    and SUPABASE_SERVICE_ROLE_KEY
    and SUPABASE_URL.startswith("https://")
    and "REPLACE_WITH_" not in SUPABASE_SERVICE_ROLE_KEY
    and not SUPABASE_SERVICE_ROLE_KEY.startswith("your-")
)
supabase: Client | None = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if _supabase_ready else None

app = FastAPI(title="EcoSathi API", version="2.0.0")
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


class StatusUpdate(BaseModel):
    status: str = Field(pattern="^(Submitted|Needs review|Verified|Assigned|In Progress|Resolved|Rejected)$")


class VoiceRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class PlanRequest(BaseModel):
    report_ids: list[int] | None = None


class StopUpdate(BaseModel):
    worker_status: str = Field(pattern="^(in_progress|completed|skipped)$")


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


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


def require_role(user: dict, *roles: str) -> None:
    if user["role"] not in roles:
        raise HTTPException(403, f"Requires one of these roles: {', '.join(roles)}.")


def report_query(client: Client):
    return client.table("reports").select(
        "id,code,user_id,location_id,title,location,category,priority,status,description,source,confirmed,idempotency_key,resolved_at,created_at,updated_at"
    )


def write_audit(client: Client, user_id: str, entity_type: str, entity_id: str, action: str, metadata: dict | None = None) -> None:
    client.table("audit_events").insert({
        "actor_id": user_id, "entity_type": entity_type, "entity_id": entity_id,
        "action": action, "metadata": metadata or {},
    }).execute()


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


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


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
    return configured().table("locations").select("*").order("name").execute().data


@app.get("/api/reports")
def list_reports(user: dict = Depends(current_user)) -> list[dict]:
    query = report_query(configured())
    if user["role"] == "resident":
        query = query.eq("user_id", user["id"])
    result = query.order("created_at", desc=True).execute()
    return [to_client_report(report) for report in result.data]


@app.post("/api/reports", status_code=201)
def create_report(payload: ReportCreate, user: dict = Depends(current_user)) -> dict:
    client = configured()
    if not payload.confirmed:
        raise HTTPException(400, "Report confirmation is required before submission.")
    if payload.idempotency_key:
        previous = client.table("reports").select("*").eq("idempotency_key", payload.idempotency_key).limit(1).execute()
        if previous.data:
            return to_client_report(previous.data[0])
    record = {
        "code": f"ECO-{uuid.uuid4().hex[:8].upper()}", "user_id": user["id"],
        **payload.model_dump(exclude_none=True), "status": "Submitted",
    }
    result = client.table("reports").insert(record).select("*").single().execute()
    write_audit(client, user["id"], "report", str(result.data["id"]), "created", {"source": payload.source})
    process_report_workflow(client, result.data, user["id"])
    refreshed = report_query(client).eq("id", result.data["id"]).single().execute()
    return to_client_report(refreshed.data or result.data)


@app.post("/api/webhooks/elevenlabs/create_waste_report", status_code=201)
def create_waste_report(payload: WebhookReport, user: dict = Depends(current_user)) -> dict:
    """Protected ElevenLabs tool: only creates a report after voice confirmation."""
    return create_report(payload, user)


@app.get("/api/reports/{code}")
def get_report(code: str, user: dict = Depends(current_user)) -> dict:
    query = report_query(configured()).eq("code", code)
    if user["role"] == "resident":
        query = query.eq("user_id", user["id"])
    result = query.limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Report not found.")
    return to_client_report(result.data[0])


@app.get("/api/webhooks/elevenlabs/get_report_status/{code}")
def get_report_status(code: str, user: dict = Depends(current_user)) -> dict:
    report = get_report(code, user)
    return {"report_id": report["id"], "status": report["status"], "last_updated": report["updated_at"]}


@app.patch("/api/reports/{code}")
def update_report_status(code: str, payload: StatusUpdate, user: dict = Depends(current_user)) -> dict:
    client = configured()
    if user["role"] == "resident" and payload.status != "Resolved":
        raise HTTPException(403, "Residents cannot change report status.")
    result = report_query(client).eq("code", code)
    if user["role"] == "resident":
        result = result.eq("user_id", user["id"])
    current = result.limit(1).execute()
    if not current.data:
        raise HTTPException(404, "Report not found.")
    report = current.data[0]
    changes = {"status": payload.status, "updated_at": now()}
    if payload.status == "Resolved":
        changes["resolved_at"] = now()
    updated = client.table("reports").update(changes).eq("id", report["id"]).select("*").single().execute()
    write_audit(client, user["id"], "report", str(report["id"]), "status_changed", {"status": payload.status})
    return to_client_report(updated.data)


@app.patch("/api/reports/{code}/status")
def update_report_status_explicit(code: str, payload: StatusUpdate, user: dict = Depends(current_user)) -> dict:
    return update_report_status(code, payload, user)


@app.get("/api/duplicates")
def list_duplicates(user: dict = Depends(current_user)) -> list[dict]:
    require_role(user, "administrator", "worker")
    return configured().table("report_links").select("*,report:reports!report_id(code,title),canonical:reports!canonical_report_id(code,title)").eq("reviewed", False).execute().data


@app.post("/api/duplicates/{link_id}/review")
def review_duplicate(link_id: int, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator")
    result = configured().table("report_links").update({"reviewed": True}).eq("id", link_id).select("*").single().execute()
    write_audit(configured(), user["id"], "report_link", str(link_id), "duplicate_reviewed")
    return result.data


@app.post("/api/collection-plans/generate")
def generate_plan(payload: PlanRequest, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    client = configured()
    run = client.table("workflow_runs").insert({
        "kind": "route_generation", "status": "running", "algorithm_version": "nearest-neighbor-v1", "started_at": now()
    }).select("*").single().execute().data
    try:
        query = report_query(client).in_("status", ["Verified", "Needs review"])
        if payload.report_ids:
            query = query.in_("id", payload.report_ids)
        reports = query.execute().data
        locations = {item["id"]: item for item in client.table("locations").select("*").execute().data}
        eligible = [item for item in reports if item.get("location_id") in locations or item.get("location")]
        ordered = sorted(eligible, key=lambda item: (priority_score(item), item["created_at"]), reverse=True)
        plan = client.table("collection_plans").insert({
            "status": "proposed", "algorithm_version": "nearest-neighbor-v1", "created_by": user["id"],
            "total_distance": route_distance(ordered, locations), "baseline_distance": route_distance(list(reversed(ordered)), locations),
        }).select("*").single().execute().data
        stops = [{
            "plan_id": plan["id"], "report_id": report["id"], "location_id": report.get("location_id"),
            "sequence": index + 1,
        } for index, report in enumerate(ordered)]
        if stops:
            client.table("collection_stops").insert(stops).execute()
            client.table("reports").update({"status": "Assigned", "updated_at": now()}).in_("id", [item["id"] for item in ordered]).execute()
        client.table("workflow_runs").update({"status": "succeeded", "completed_at": now()}).eq("id", run["id"]).execute()
        write_audit(client, user["id"], "collection_plan", str(plan["id"]), "generated", {"stop_count": len(stops)})
        return get_plan(plan["id"], user)
    except Exception as error:
        client.table("workflow_runs").update({"status": "failed", "error": str(error), "completed_at": now()}).eq("id", run["id"]).execute()
        raise HTTPException(500, "Route generation failed.") from error


@app.get("/api/collection-plans")
def list_plans(user: dict = Depends(current_user)) -> list[dict]:
    require_role(user, "administrator", "worker")
    return configured().table("collection_plans").select("*,collection_stops(*)").order("created_at", desc=True).execute().data


@app.get("/api/collection-plans/{plan_id}")
def get_plan(plan_id: str, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    result = configured().table("collection_plans").select("*,collection_stops(*)").eq("id", plan_id).limit(1).execute()
    if not result.data:
        raise HTTPException(404, "Collection plan not found.")
    return result.data[0]


@app.patch("/api/collection-stops/{stop_id}")
def update_stop(stop_id: int, payload: StopUpdate, user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    client = configured()
    changes = {"worker_status": payload.worker_status}
    if payload.worker_status == "completed":
        changes["completed_at"] = now()
    result = client.table("collection_stops").update(changes).eq("id", stop_id).select("*").single().execute()
    if payload.worker_status == "completed":
        client.table("reports").update({"status": "Resolved", "resolved_at": now(), "updated_at": now()}).eq("id", result.data["report_id"]).execute()
    write_audit(client, user["id"], "collection_stop", str(stop_id), "worker_status_changed", changes)
    return result.data


@app.get("/api/workflows")
def list_workflows(user: dict = Depends(current_user)) -> list[dict]:
    require_role(user, "administrator", "worker")
    return configured().table("workflow_runs").select("*").order("created_at", desc=True).limit(100).execute().data


@app.get("/api/analytics/summary")
def analytics_summary(user: dict = Depends(current_user)) -> dict:
    require_role(user, "administrator", "worker")
    reports = configured().table("reports").select("status,created_at,resolved_at").execute().data
    resolved = [item for item in reports if item.get("resolved_at")]
    times = [(datetime.fromisoformat(item["resolved_at"].replace("Z", "+00:00")) - datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))).total_seconds() / 3600 for item in resolved]
    return {
        "total_reports": len(reports),
        "resolved_reports": len(resolved),
        "open_reports": sum(item["status"] != "Resolved" for item in reports),
        "resolution_rate": round(len(resolved) / len(reports), 3) if reports else 0,
        "median_resolution_hours": round(sorted(times)[len(times) // 2], 2) if times else None,
        "demo_data": True,
    }


def process_report_workflow(client: Client, report: dict, actor_id: str) -> None:
    run = client.table("workflow_runs").insert({
        "kind": "report_processing", "report_id": report["id"], "status": "running",
        "algorithm_version": "triage-duplicate-v1", "started_at": now(),
    }).select("*").single().execute().data
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        duplicate_query = client.table("reports").select("id,code,title").eq(
            "category", report["category"]
        ).neq("id", report["id"]).neq("status", "Resolved").gte(
            "created_at", cutoff.isoformat()
        )
        if report.get("location_id"):
            duplicate_query = duplicate_query.eq("location_id", report["location_id"])
        else:
            duplicate_query = duplicate_query.eq("location", report["location"])
        candidates = duplicate_query.execute().data
        if candidates:
            client.table("report_links").upsert({
                "report_id": report["id"], "canonical_report_id": candidates[0]["id"],
                "match_reason": "same location and category within review window",
                "confidence": 0.75, "reviewed": False,
            }, on_conflict="report_id,canonical_report_id").execute()
            next_status = "Needs review"
        else:
            next_status = "Verified"
        client.table("reports").update({"status": next_status, "updated_at": now()}).eq(
            "id", report["id"]
        ).execute()
        client.table("workflow_runs").update({
            "status": "succeeded", "completed_at": now()
        }).eq("id", run["id"]).execute()
    except Exception as error:
        client.table("workflow_runs").update({
            "status": "failed", "error": str(error), "completed_at": now()
        }).eq("id", run["id"]).execute()


@app.post("/api/voice/synthesize")
async def synthesize_voice(payload: VoiceRequest, _user: dict = Depends(current_user)) -> Response:
    api_key, voice_id = os.getenv("ELEVENLABS_API_KEY"), os.getenv("ELEVENLABS_VOICE_ID")
    if not api_key or not voice_id:
        raise HTTPException(503, "ElevenLabs is not configured.")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}", headers={"xi-api-key": api_key, "Content-Type": "application/json"}, json={"text": payload.text, "model_id": "eleven_multilingual_v2", "output_format": "mp3_44100_128"})
    if response.status_code >= 400:
        raise HTTPException(response.status_code, "ElevenLabs synthesis failed.")
    return Response(content=response.content, media_type="audio/mpeg")


def priority_score(report: dict) -> int:
    return {"Low": 1, "Medium": 2, "High": 3, "Urgent": 4}.get(report.get("priority"), 1) * 100


def route_distance(reports: list[dict], locations: dict) -> float:
    points = [(29.8645, 77.8960)] + [(locations[item["location_id"]]["latitude"], locations[item["location_id"]]["longitude"]) for item in reports if item.get("location_id") in locations]
    return round(sum(math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]) * 111 for index in range(1, len(points))), 2)


def to_client_report(report: dict) -> dict:
    created = datetime.fromisoformat(report["created_at"].replace("Z", "+00:00"))
    minutes = max(0, int((datetime.now(timezone.utc) - created).total_seconds() // 60))
    age = "just now" if minutes < 1 else f"{minutes} min ago" if minutes < 60 else f"{minutes // 60} hr ago"
    return {**report, "id": report["code"], "age": age, "initials": "YU", "color": "green"}
