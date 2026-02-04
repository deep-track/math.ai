"""
Math.AI FastAPI Backend Server

This server connects the AI logic (orchestrator.py) to the React frontend.
Run with: uvicorn src.api.server:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os
import json
from datetime import datetime, timedelta

# 1. Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 2. Import the AI orchestrator
from src.engine.orchestrator import ask_math_ai, ask_math_ai_stream

# Initialize FastAPI app
app = FastAPI(
    title="Math.AI Backend",
    description="Backend API for the Math.AI tutor application",
    version="1.0.0"
)

# Create API router with /api prefix
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

# CORS preflight catch-all for environments that strip middleware headers
@api_router.options("/{path:path}")
async def _cors_preflight(path: str, request: Request):
    """Handle CORS preflight (OPTIONS) requests for any API path.

    Some proxies or hosting layers may not preserve FastAPI's CORS middleware
    for OPTIONS requests routed to streaming or proxied endpoints. This
    explicit handler ensures we always return the expected Access-Control
    headers for the requesting origin.
    """
    origin = request.headers.get("origin") or "*"
    ac_req_headers = request.headers.get("access-control-request-headers", "*")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
        "Access-Control-Allow-Headers": ac_req_headers,
        "Access-Control-Allow-Credentials": "true",
    }
    return Response(status_code=204, headers=headers)


# Debug endpoint to inspect incoming Origin and response headers
@api_router.get("/debug-cors")
async def _debug_cors(request: Request):
    origin = request.headers.get("origin")
    return JSONResponse({
        "origin": origin,
        "received_headers": {k: v for k, v in request.headers.items()}
    }, headers={
        "Access-Control-Allow-Origin": origin or "*",
        "Access-Control-Allow-Credentials": "true"
    })
# 3. CORS Configuration - Allow frontend to communicate
# Include all dev ports and production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
        # Local network
        "http://192.168.0.101:5173",
        "http://192.168.0.101:5174",
        "http://192.168.0.101:5175",
        "http://192.168.0.101:3000",
        # Production
        "https://deep-track-mathai.vercel.app",
        "https://www.mathai.fr",
        "https://mathai.fr",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 4. Define request/response data models

class QuestionRequest(BaseModel):
    """Data format for incoming questions from the frontend"""
    text: str                          # The math question
    user_id: str = "guest"             # User identifier
    context: str = ""                  # Optional context for better answers
    session_id: str = ""               # Optional session tracking


class AcademicStep(BaseModel):
    """Step in an academic solution"""
    title: str
    explanation: str
    equations: Optional[List[str]] = None


class AcademicResponseModel(BaseModel):
    """Academic format response matching frontend expectations"""
    partie: str
    problemStatement: str
    steps: List[AcademicStep]
    conclusion: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    timestamp: str


# 5. Test endpoint - Simple test
@app.post("/test")
async def test_endpoint():
    """
    Simple test endpoint to verify backend is working
    """
    return {
        "success": True,
        "message": "Backend is working!",
        "timestamp": datetime.now().isoformat()
    }

# 6. Main endpoint - Ask a question
@api_router.post("/ask", response_model=AcademicResponseModel)
async def ask_endpoint(request: QuestionRequest):
    """
    Main endpoint for solving math problems.
    
    The frontend sends a question, the backend processes it through
    the AI orchestrator, and returns a structured academic response.
    
    Args:
        request: QuestionRequest containing the math problem
        
    Returns:
        AcademicResponseModel with structured solution
        
    Raises:
        HTTPException: If processing fails
    """
    try:
        # Log the incoming request
        print(f"\n{'='*60}")
        print(f"[REQUEST] {datetime.now().isoformat()}")
        print(f"  User ID: {request.user_id}")
        print(f"  Session: {request.session_id}")
        print(f"  Question: {request.text[:100]}...")
        print(f"{'='*60}")
        
        # Call the AI orchestrator - returns AcademicResponse format
        print("[INFO] Calling orchestrator...")
        result = ask_math_ai(request.text)
        print(f"[DEBUG] Result type: {type(result)}")
        print(f"[DEBUG] Result keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
        
        # The orchestrator returns a dict matching AcademicResponse structure
        if isinstance(result, dict):
            # Validate it has required fields
            if not all(key in result for key in ['partie', 'problemStatement', 'steps']):
                raise ValueError("Orchestrator response missing required fields")
            
            # Convert steps to AcademicStep objects if needed
            steps = []
            for step in result.get('steps', []):
                if isinstance(step, dict):
                    steps.append(AcademicStep(
                        title=step.get('title', 'Step'),
                        explanation=step.get('explanation', ''),
                        equations=step.get('equations')
                    ))
                else:
                    steps.append(step)
            
            # Build academic response
            response_data = AcademicResponseModel(
                partie=result.get('partie', 'Analysis'),
                problemStatement=result.get('problemStatement', request.text),
                steps=steps,
                conclusion=result.get('conclusion')
            )
        else:
            raise ValueError("Orchestrator did not return a dictionary")
        
        # Log successful response
        print(f"[RESPONSE] Academic response generated successfully")
        print(f"  Partie: {response_data.partie}")
        print(f"  Steps: {len(response_data.steps)}")
        print(f"{'='*60}\n")
        
        return response_data
        
    except Exception as e:
        # Log error with traceback
        error_message = str(e)
        print(f"\n[ERROR] {datetime.now().isoformat()}")
        print(f"  User: {request.user_id}")
        print(f"  Question: {request.text[:100]}...")
        print(f"  Error: {error_message}")
        print(f"{'='*60}\n")
        
        import traceback
        traceback.print_exc()
        
        # Return error response
        raise HTTPException(
            status_code=500,
            detail=error_message
        )

# 6b. Streaming endpoint - Ask a question with streaming response
@api_router.post("/ask-stream")
async def ask_stream_endpoint(request: QuestionRequest, http_req: Request):
    """Streaming endpoint - SSE format

    Accepts optional session headers (X-Session-Id or Authorization: Bearer <token>) and will attempt
    to charge the user's credits on successful completion of the stream. Returns a 'charged' SSE event
    with remaining credits if the server performed the charge.
    """
    
    print(f"\n[STREAM] Question: {request.text}")
    
    def generate():  # NOT async - your orchestrator is sync!
        try:
            # Send connection
            yield ": connected\n\n"
            
            chunk_count = 0
            
            # Get stream from orchestrator (it's a regular generator, not async)
            for ndjson_line in ask_math_ai_stream(request.text, history=""):
                # Parse the NDJSON line
                line = ndjson_line.strip()
                if not line:
                    continue
                
                try:
                    chunk_obj = json.loads(line)
                    chunk_type = chunk_obj.get("type", "")

                    if chunk_type == "chunk":
                        text = chunk_obj.get("text", "")
                        if text:
                            chunk_count += 1
                            # Send as SSE - frontend expects {token: text}
                            yield f"data: {json.dumps({'token': text})}\n\n"
                            print(f"→ Chunk {chunk_count}: {text[:30]}")

                    elif chunk_type == "start":
                        # Send metadata - frontend expects {metadata: chunk_obj}
                        yield f"data: {json.dumps({'metadata': chunk_obj})}\n\n"

                    elif chunk_type == "end":
                        # Send conclusion - frontend expects {conclusion: text}
                        yield f"data: {json.dumps({'conclusion': chunk_obj.get('conclusion', '')})}\n\n"
                    
                except json.JSONDecodeError:
                    continue
            
            # If a session header was provided, attempt to charge the user's credits on the server side
            try:
                session_header = http_req.headers.get('x-session-id') or http_req.headers.get('authorization')
                if session_header:
                    if session_header.lower().startswith('bearer '):
                        session_token = session_header.split(' ', 1)[1]
                    else:
                        session_token = session_header

                    # Determine verified user id (respect dev bypass)
                    if DEV_SKIP_CLERK_VERIFY:
                        user_id_verified = request.user_id
                    else:
                        if CLERK_API_KEY:
                            user_id_verified = _verify_clerk_session(session_token)
                        else:
                            user_id_verified = request.user_id

                    if user_id_verified:
                        print(f"[CREDITS] Attempting server-side charge for user: {user_id_verified}")
                        rec = None
                        if USE_MONGO:
                            # Run async decrement in a dedicated loop for this sync generator
                            loop = asyncio.new_event_loop()
                            try:
                                rec = loop.run_until_complete(_spend_credit_record_async(user_id_verified))
                            finally:
                                try:
                                    loop.close()
                                except Exception:
                                    pass
                        else:
                            rec = spend_credit_record(user_id_verified)

                        if rec is None:
                            # Inform client that there were no credits
                            yield f"data: {json.dumps({'error': 'No credits remaining'})}\n\n"
                            print(f"[CREDITS] No credits remaining for user: {user_id_verified}")
                        else:
                            # Inform client of remaining credits so UI can be updated
                            yield f"data: {json.dumps({'charged': True, 'remaining': rec['remaining']})}\n\n"
                            print(f"[CREDITS] Charged user {user_id_verified}, remaining={rec['remaining']}")
            except Exception as e:
                print(f"[CREDITS] Server-side charge failed: {e}")

            # Send done
            yield f"data: {json.dumps({'done': True})}\n\n"
            print(f"✅ Complete - {chunk_count} chunks")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),  # Pass generator directly
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "*",
        }
    )

# --- Conversation & Credits storage (MongoDB or fallback file-based) ---
STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR, exist_ok=True)

CREDITS_FILE = os.path.join(STORAGE_DIR, "credits.json")
CONVERSATIONS_FILE = os.path.join(STORAGE_DIR, "conversations.json")
DEFAULT_CREDITS = 100

# MongoDB support (optional) with SSL/TLS certificate handling
MONGODB_URI = os.environ.get('MONGODB_URI')
MONGODB_DB = os.environ.get('MONGODB_DB', 'mathai')
USE_MONGO = bool(MONGODB_URI)

if USE_MONGO:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from pymongo import ReturnDocument
        import certifi
        
        # Add SSL certificate verification using certifi
        # This fixes "SSL: TLSV1_ALERT_INTERNAL_ERROR" on Windows/macOS
        mongo_client = AsyncIOMotorClient(
            MONGODB_URI,
            tlsCAFile=certifi.where(),  # Use certifi's CA bundle for SSL verification
            serverSelectionTimeoutMS=5000  # Timeout after 5 seconds if unreachable
        )
        mongo_db = mongo_client[MONGODB_DB]
        credits_coll = mongo_db['credits']
        conversations_coll = mongo_db['conversations']
        print('[MONGO] MongoDB client initialized with SSL/TLS certificate verification')
    except ImportError:
        print('[MONGO] certifi not installed. Run: pip install certifi')
        print('[MONGO] Falling back to file-based storage')
        USE_MONGO = False
    except Exception as e:
        print(f'[MONGO] Failed to initialize MongoDB client: {e}')
        print('[MONGO] Using file-based storage as fallback')
        USE_MONGO = False

from threading import Lock
_storage_lock = Lock()


def _load_json(path, default):
    try:
        if not os.path.exists(path):
            return default
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return default


def _save_json(path, data):
    with _storage_lock:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, default=str)


# --- File-backed sync helpers (used by async wrappers) ---
def get_credits_record(user_id: str):
    records = _load_json(CREDITS_FILE, {})
    today = datetime.utcnow().date().isoformat()
    rec = records.get(user_id)
    if not rec or rec.get('lastReset') < today:
        rec = {'remaining': DEFAULT_CREDITS, 'lastReset': today}
        records[user_id] = rec
        _save_json(CREDITS_FILE, records)
    return rec


def spend_credit_record(user_id: str):
    records = _load_json(CREDITS_FILE, {})
    rec = records.get(user_id) or {'remaining': DEFAULT_CREDITS, 'lastReset': datetime.utcnow().date().isoformat()}
    if rec.get('remaining', 0) <= 0:
        return None
    rec['remaining'] = rec.get('remaining', 0) - 1
    records[user_id] = rec
    _save_json(CREDITS_FILE, records)
    return rec


def reset_all_credits():
    today = datetime.utcnow().date().isoformat()
    records = _load_json(CREDITS_FILE, {})
    for uid in list(records.keys()):
        records[uid] = {'remaining': DEFAULT_CREDITS, 'lastReset': today}
    _save_json(CREDITS_FILE, records)
    return records


def _get_conversations_for_user(user_id: str):
    all_convs = _load_json(CONVERSATIONS_FILE, {})
    # Return a deep copy to avoid accidental mutation
    return json.loads(json.dumps(all_convs.get(user_id, [])))


def _save_conversations_for_user(user_id: str, conversations: list):
    all_convs = _load_json(CONVERSATIONS_FILE, {})
    all_convs[user_id] = conversations
    _save_json(CONVERSATIONS_FILE, all_convs)
    return True


# Clerk session verification helper (dev-friendly)
import requests
CLERK_API_KEY = os.environ.get('CLERK_API_KEY')
CLERK_API_BASE = os.environ.get('CLERK_API_BASE', 'https://api.clerk.com/v1')
# Development escape hatch: when set to 'true' this skips Clerk verification so you can test locally
DEV_SKIP_CLERK_VERIFY = os.environ.get('DEV_SKIP_CLERK_VERIFY', 'false').lower() == 'true'


def _verify_clerk_session(session_id: str) -> Optional[str]:
    """Verify a Clerk session ID via Clerk REST API and return the user_id if valid.

    In development, if DEV_SKIP_CLERK_VERIFY is set to true, this will bypass Clerk and return
    the provided session_id (useful for local testing). If Clerk is not configured, we return
    None so the caller can handle unauthenticated requests gracefully.
    """
    if DEV_SKIP_CLERK_VERIFY:
        # Return the token as a stand-in for user id in dev mode
        return session_id

    if not CLERK_API_KEY:
        # Clerk not configured in this environment — treat session as invalid instead of raising
        return None
    try:
        url = f"{CLERK_API_BASE}/sessions/{session_id}"
        headers = {"Authorization": f"Bearer {CLERK_API_KEY}"}
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code != 200:
            return None
        data = r.json()
        return data.get('user_id')
    except Exception:
        return None


# Async wrappers for credits (works with either MongoDB or JSON files)
import asyncio

async def _get_credits_record_async(user_id: str):
    today = datetime.utcnow().date().isoformat()

    if USE_MONGO:
        # Upsert default if missing or stale
        doc = await credits_coll.find_one({'user_id': user_id})
        if not doc or doc.get('lastReset') < today:
            rec = {'user_id': user_id, 'remaining': DEFAULT_CREDITS, 'lastReset': today}
            await credits_coll.update_one({'user_id': user_id}, {'$set': rec}, upsert=True)
            return rec
        return doc

    # Fallback to file-based (run in thread pool)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_credits_record, user_id)


async def _spend_credit_record_async(user_id: str):
    if USE_MONGO:
        # Atomic decrement if remaining > 0
        doc = await credits_coll.find_one_and_update(
            {'user_id': user_id, 'remaining': {'$gt': 0}},
            {'$inc': {'remaining': -1}},
            return_document=ReturnDocument.AFTER
        )
        return doc

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, spend_credit_record, user_id)


async def _reset_all_credits_async():
    today = datetime.utcnow().date().isoformat()
    if USE_MONGO:
        await credits_coll.update_many({}, {'$set': {'remaining': DEFAULT_CREDITS, 'lastReset': today}})
        return
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, reset_all_credits)


# Conversations (async wrappers)
async def _get_conversations_for_user_async(user_id: str):
    if USE_MONGO:
        cursor = conversations_coll.find({'user_id': user_id}).sort('updatedAt', -1)
        docs = await cursor.to_list(length=100)
        # Convert ObjectId and non-JSON types to plain dicts
        result = []
        for d in docs:
            d_copy = dict(d)
            if '_id' in d_copy:
                d_copy['_id'] = str(d_copy['_id'])
            # Ensure datetimes are ISO strings
            for ts in ('createdAt', 'updatedAt'):
                if ts in d_copy and hasattr(d_copy[ts], 'isoformat'):
                    try:
                        d_copy[ts] = d_copy[ts].isoformat()
                    except Exception:
                        pass
            result.append(d_copy)
        return result
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _get_conversations_for_user, user_id)


async def _save_conversations_for_user_async(user_id: str, conversations: list):
    if USE_MONGO:
        # Replace user's conversations (simple approach)
        # Remove existing for user then insert docs with user_id (drop any existing _id to avoid duplicate key)
        await conversations_coll.delete_many({'user_id': user_id})
        if conversations:
            for c in conversations:
                c_copy = dict(c)
                # Remove any pre-existing Mongo _id to avoid duplicate key insert errors
                c_copy.pop('_id', None)
                c_copy['user_id'] = user_id
                await conversations_coll.insert_one(c_copy)
        return
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _save_conversations_for_user, user_id, conversations)


# Migration: if Mongo is enabled and JSON files exist, migrate them on startup
async def _migrate_json_to_mongo():
    if not USE_MONGO:
        return
    try:
        if os.path.exists(CREDITS_FILE):
            records = _load_json(CREDITS_FILE, {})
            for uid, rec in records.items():
                rec_copy = dict(rec)
                rec_copy['user_id'] = uid
                await credits_coll.update_one({'user_id': uid}, {'$set': rec_copy}, upsert=True)
            print('[MONGO] Migrated credits.json to MongoDB')

        if os.path.exists(CONVERSATIONS_FILE):
            convs = _load_json(CONVERSATIONS_FILE, {})
            for uid, items in convs.items():
                # store each conversation separately and attach user_id
                for c in items:
                    c_copy = dict(c)
                    c_copy['user_id'] = uid
                    await conversations_coll.update_one({'user_id': uid, 'id': c_copy.get('id')}, {'$set': c_copy}, upsert=True)
            print('[MONGO] Migrated conversations.json to MongoDB')
    except Exception as e:
        print('[MONGO] Migration error:', e)


# API: Credits endpoints (now using async wrappers with error handling)
@api_router.get("/credits/{user_id}")
async def api_get_credits(user_id: str, request: Request):
    """Get user credits. Falls back gracefully if MongoDB fails."""
    try:
        # Read session header
        session_header = request.headers.get('x-session-id') or request.headers.get('authorization')

        if session_header:
            # If authorization header provided as Bearer <token>, extract token
            if session_header.lower().startswith('bearer '):
                session_token = session_header.split(' ', 1)[1]
            else:
                session_token = session_header
            # In dev bypass mode, accept the path user_id directly
            if DEV_SKIP_CLERK_VERIFY:
                user_id_verified = user_id
            else:
                user_id_verified = _verify_clerk_session(session_token)
                if not user_id_verified:
                    raise HTTPException(status_code=401, detail='Invalid Clerk session')
                if user_id_verified != user_id:
                    raise HTTPException(status_code=403, detail='User ID does not match session')
            rec = await _get_credits_record_async(user_id_verified)
            return {"user_id": user_id_verified, "remaining": rec["remaining"], "lastReset": rec["lastReset"]}

        # No session header -> guest or server-side lookup
        rec = await _get_credits_record_async(user_id)
        return {"user_id": user_id, "remaining": rec["remaining"], "lastReset": rec["lastReset"]}
    except Exception as e:
        print(f"[CREDITS] Error fetching credits for {user_id}: {e}")
        # Fallback: return default credits
        return {"user_id": user_id, "remaining": DEFAULT_CREDITS, "lastReset": datetime.utcnow().date().isoformat()}


@api_router.post("/credits/{user_id}/spend")
async def api_spend_credit(user_id: str, request: Request):
    print(f"[CREDITS] /spend called for user_id={user_id}")
    # Require X-Session-Id header and validate
    session_header = request.headers.get('x-session-id') or request.headers.get('authorization')
    if not session_header:
        if DEV_SKIP_CLERK_VERIFY:
            # Allow spend in dev mode without a token; use a dummy token
            session_token = 'dev'
        else:
            raise HTTPException(status_code=401, detail='Missing session header (X-Session-Id)')
    else:
        if session_header.lower().startswith('bearer '):
            session_token = session_header.split(' ', 1)[1]
        else:
            session_token = session_header

    # Development bypass: if enabled, accept the provided user_id path param without Clerk verification
    if DEV_SKIP_CLERK_VERIFY:
        user_id_verified = user_id
    else:
        # If CLERK backend verification is available, use it; otherwise in dev accept the provided user_id
        if CLERK_API_KEY:
            user_id_verified = _verify_clerk_session(session_token)
            if not user_id_verified:
                raise HTTPException(status_code=401, detail='Invalid Clerk session')
            if user_id_verified != user_id:
                raise HTTPException(status_code=403, detail='User ID does not match session')
        else:
            # Development fallback: trust user_id path param when Clerk backend not configured
            user_id_verified = user_id

    rec = await _spend_credit_record_async(user_id_verified)
    if rec is None:
        raise HTTPException(status_code=402, detail="No credits remaining")
    return {"user_id": user_id_verified, "remaining": rec["remaining"]} 


@api_router.post("/credits/{user_id}/reset")
async def api_reset_credits(user_id: str):
    # Admin-style reset; require ADMIN_RESET_KEY env var
    ADMIN_RESET_KEY = os.environ.get('ADMIN_RESET_KEY')
    if not ADMIN_RESET_KEY:
        raise HTTPException(status_code=403, detail='Reset not allowed')

    # Perform reset in the underlying storage
    today = datetime.utcnow().date().isoformat()
    if USE_MONGO:
        await credits_coll.update_one({'user_id': user_id}, {'$set': {'remaining': DEFAULT_CREDITS, 'lastReset': today}}, upsert=True)
    else:
        records = _load_json(CREDITS_FILE, {})
        records[user_id] = {"remaining": DEFAULT_CREDITS, "lastReset": today}
        _save_json(CREDITS_FILE, records)
    return {"user_id": user_id, "remaining": DEFAULT_CREDITS} 


# API: Conversations endpoints
@api_router.get("/conversations/{user_id}")
async def api_get_conversations(user_id: str):
    """Get user conversations. Returns empty list if storage fails."""
    try:
        convs = await _get_conversations_for_user_async(user_id)
        # sort by updatedAt descending
        convs_sorted = sorted(convs, key=lambda c: c.get("updatedAt", c.get("createdAt", "")), reverse=True)
        return convs_sorted
    except Exception as e:
        print(f"[CONVERSATIONS] Error fetching conversations for {user_id}: {e}")
        # Fallback: return empty list
        return [] 


class ConversationCreate(BaseModel):
    title: str = Field("Chat")


@api_router.post("/conversations/{user_id}")
async def api_create_conversation(user_id: str, payload: ConversationCreate):
    """Create a new conversation. Returns success even if storage fails."""
    try:
        convs = await _get_conversations_for_user_async(user_id)
        conv = {"id": f"conv-{int(datetime.utcnow().timestamp()*1000)}", "title": payload.title, "createdAt": datetime.utcnow().isoformat(), "updatedAt": datetime.utcnow().isoformat(), "messages": []}
        convs.append(conv)
        await _save_conversations_for_user_async(user_id, convs)
        return conv
    except Exception as e:
        print(f"[CONVERSATIONS] Error creating conversation for {user_id}: {e}")
        # Fallback: return a temporary conversation object (not persisted)
        conv = {"id": f"conv-{int(datetime.utcnow().timestamp()*1000)}", "title": payload.title, "createdAt": datetime.utcnow().isoformat(), "updatedAt": datetime.utcnow().isoformat(), "messages": []}
        return conv


@api_router.get("/conversations/{user_id}/{conversation_id}")
async def api_get_conversation(user_id: str, conversation_id: str):
    """Get a specific conversation. Returns success even if storage fails."""
    try:
        convs = await _get_conversations_for_user_async(user_id)
        for c in convs:
            if c["id"] == conversation_id:
                return c
        raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONVERSATIONS] Error fetching conversation {conversation_id} for {user_id}: {e}")
        # Fallback: return a stub conversation
        return {"id": conversation_id, "title": "Conversation", "createdAt": datetime.utcnow().isoformat(), "updatedAt": datetime.utcnow().isoformat(), "messages": []}


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[list] = None


@api_router.put("/conversations/{user_id}/{conversation_id}")
async def api_update_conversation(user_id: str, conversation_id: str, payload: ConversationUpdate):
    """Update a conversation. Returns success even if storage fails."""
    try:
        convs = await _get_conversations_for_user_async(user_id)
        for idx, c in enumerate(convs):
            if c["id"] == conversation_id:
                if payload.title is not None:
                    c["title"] = payload.title
                if payload.messages is not None:
                    c["messages"] = payload.messages
                c["updatedAt"] = datetime.utcnow().isoformat()
                convs[idx] = c
                await _save_conversations_for_user_async(user_id, convs)
                return c
        raise HTTPException(status_code=404, detail="Conversation not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONVERSATIONS] Error updating conversation {conversation_id} for {user_id}: {e}")
        # Fallback: return updated stub conversation
        updated = {"id": conversation_id, "title": payload.title or "Conversation", "updatedAt": datetime.utcnow().isoformat(), "messages": payload.messages or []}
        return updated


@api_router.delete("/conversations/{user_id}/{conversation_id}")
async def api_delete_conversation(user_id: str, conversation_id: str):
    """Delete a conversation. Returns success even if storage fails."""
    try:
        convs = await _get_conversations_for_user_async(user_id)
        new_convs = [c for c in convs if c["id"] != conversation_id]
        if len(new_convs) == len(convs):
            raise HTTPException(status_code=404, detail="Conversation not found")
        await _save_conversations_for_user_async(user_id, new_convs)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONVERSATIONS] Error deleting conversation {conversation_id} for {user_id}: {e}")
        # Fallback: return success (optimistic delete)
        return {"success": True} 


# Midnight reset background task (runs at France local midnight — Europe/Paris timezone)
import asyncio
# Try to create a proper Europe/Paris timezone; if tzdata or zoneinfo is not available
# fall back to a fixed CET (UTC+1) timezone. This fallback does not handle DST transitions.
try:
    from zoneinfo import ZoneInfo
    try:
        PARIS_TZ = ZoneInfo('Europe/Paris')
    except Exception:
        from datetime import timezone, timedelta
        PARIS_TZ = timezone(timedelta(hours=1))
        print("[CREDITS] Warning: ZoneInfo('Europe/Paris') not available; falling back to fixed CET (UTC+1). Install tzdata for DST-aware behavior.")
except Exception:
    from datetime import timezone, timedelta
    PARIS_TZ = timezone(timedelta(hours=1))
    print("[CREDITS] Warning: zoneinfo not available; falling back to fixed CET (UTC+1).")

async def _midnight_reset_loop():
    while True:
        now = datetime.now(tz=PARIS_TZ)
        tomorrow = (now + timedelta(days=1)).date()
        midnight = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0, tzinfo=PARIS_TZ)
        seconds = (midnight - now).total_seconds() + 1
        print(f"[CREDITS] Sleeping {int(seconds)}s until next Paris midnight reset (next at {midnight.isoformat()})")
        await asyncio.sleep(seconds)
        try:
            await _reset_all_credits_async()
            print("[CREDITS] Reset all credits to default at Paris midnight (Europe/Paris)")
        except Exception as e:
            print("[CREDITS] Error resetting credits:", e)

# Start background task and run migrations on startup
@app.on_event("startup")
async def _start_midnight_task():
    # Run migration to MongoDB if enabled
    if USE_MONGO:
        asyncio.create_task(_migrate_json_to_mongo())
    asyncio.create_task(_midnight_reset_loop())


# 6. Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check if the backend is running and healthy.
    Used by the frontend to verify backend connectivity.
    """
    return HealthResponse(
        status="ok",
        service="Math.AI Backend",
        timestamp=datetime.now().isoformat()
    )

# 7. Root endpoint
@app.get("/")
async def root():
    """Welcome message and API info"""
    return {
        "service": "Math.AI Backend",
        "version": "1.0.0",
        "endpoints": {
            "POST /ask": "Submit a math question",
            "GET /health": "Check backend health",
            "GET /docs": "API documentation (Swagger UI)",
            "GET /redoc": "Alternative API documentation"
        }
    }

# 8. Error handler
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError exceptions"""
    return JSONResponse(status_code=400, content={
        "success": False,
        "error": str(exc),
        "timestamp": datetime.now().isoformat()
    })

# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on server startup"""
    print("\n" + "="*60)
    print("Math.AI Backend Starting...")
    print("✓ FastAPI server initialized")
    print("✓ CORS enabled for frontend communication")
    print("✓ AI orchestrator ready")
    if USE_MONGO:
        print("✓ MongoDB enabled")
        # Ensure indexes for collections
        try:
            await credits_coll.create_index("user_id", unique=True)
            await conversations_coll.create_index([("user_id", 1), ("id", 1)], unique=True)
            print("[MONGO] Ensured indexes on credits and conversations collections")
        except Exception as e:
            print("[MONGO] Index creation failed:", e)

    print("\nAPI Documentation available at:")
    print("   http://localhost:8000/docs")
    print("   http://localhost:8000/redoc")
    print("\nReady to process questions!")
    print("="*60 + "\n")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on server shutdown"""
    print("\n" + "="*60)
    print(" Math.AI Backend Shutting Down...")
    print("="*60 + "\n")

# Include the API router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    print("Starting Math.AI Backend...")
    print("Run from the AI_logic directory:")
    print("  cd AI_logic")
    print("  uvicorn src.api.server:app --reload --port 8000")
    
    uvicorn.run(
        "src.api.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
