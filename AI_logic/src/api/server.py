"""
Math.AI FastAPI Backend Server

This server connects the AI logic (orchestrator.py) to the React frontend.
Run with: uvicorn src.api.server:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os
import json
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import re

# 1. Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 2. Import the AI orchestrator
from src.engine.orchestrator import ask_math_ai, ask_math_ai_stream
from src.utils.process_uploads import process_uploaded_image

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


# Debug endpoint to identify outbound IP for MongoDB whitelisting
@api_router.get("/debug-ip")
async def _debug_ip(request: Request):
    """
    Identify the outbound IP address that this Render service uses.
    This is the IP you need to whitelist on MongoDB Atlas.
    
    MongoDB Atlas will see connections coming from this IP address.
    """
    import socket
    
    # Get inbound headers (what the browser/client sees)
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    cf_connecting_ip = request.headers.get("cf-connecting-ip", "")
    true_client_ip = request.headers.get("true-client-ip", "")
    
    # Try to detect outbound IP by attempting DNS resolution
    outbound_ip_info = {
        "method": "unknown",
        "ip": "unknown",
        "note": "Could not determine outbound IP"
    }
    
    try:
        # Method 1: Get hostname and resolve to IP (this might be the outbound IP on Render)
        hostname = socket.gethostname()
        try:
            outbound_ip = socket.gethostbyname(hostname)
            outbound_ip_info = {
                "method": "hostname_resolution",
                "ip": outbound_ip,
                "hostname": hostname,
                "note": "This is the IP Render uses for outbound connections"
            }
        except Exception as e:
            print(f"[DEBUG-IP] Failed to resolve hostname: {e}")
    except Exception as e:
        print(f"[DEBUG-IP] Error getting outbound IP: {e}")
    
    return JSONResponse({
        "inbound": {
            "client_ip": client_ip,
            "x_forwarded_for": forwarded_for,
            "cf_connecting_ip": cf_connecting_ip,
            "true_client_ip": true_client_ip,
            "note": "These are IPs from which requests appear to come"
        },
        "outbound": outbound_ip_info,
        "instruction": "Whitelist the 'outbound.ip' on MongoDB Atlas > Network Access > Add IP Address",
        "all_headers": {k: v for k, v in request.headers.items()}
    }, headers={
        "Access-Control-Allow-Origin": "*",
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
        "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",      
        "http://127.0.0.1:5176",

        # Local network
        "http://192.168.0.101:5173",
        "http://192.168.0.101:5174",
        "http://192.168.0.101:5175",
        "http://192.168.0.101:3000",
        # Production
        "https://deep-track-mathai.vercel.app",
        "https://www.mathai.fr",
        "https://mathai.fr",
        "https://mathai-deeptracks-projects-32338107.vercel.app",
        "https://math-ai-1-b5es.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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


class FeedbackRequest(BaseModel):
    solutionId: str
    type: str
    timestamp: int
    additionalComments: Optional[str] = None
    userId: Optional[str] = None
    topic: Optional[str] = None


class AnalyticsEventRequest(BaseModel):
    eventType: str
    solutionId: Optional[str] = None
    responseTime: Optional[int] = None
    timestamp: int
    userId: Optional[str] = None
    topic: Optional[str] = None


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
async def ask_endpoint(
    request: Request,
    text: Optional[str] = Form(None),
    image: UploadFile = File(None),
    user_id: Optional[str] = Form(None),
):
    """
    Main endpoint for solving math problems.
    
    The frontend sends a question, the backend processes it through
    the AI orchestrator, and returns a structured academic response.
    
    Args:
        text: The math question
        image: Optional uploaded image file
        
    Returns:
        AcademicResponseModel with structured solution
        
    Raises:
        HTTPException: If processing fails
    """
    try:
        if text is None:
            try:
                payload = await request.json()
            except Exception:
                payload = {}

            if isinstance(payload, dict):
                text = payload.get("text") or payload.get("question") or payload.get("content")
                user_id = payload.get("user_id") or payload.get("userId") or user_id

        if not text or not str(text).strip():
            raise HTTPException(status_code=400, detail="Missing 'text' field in request.")

        user_id = user_id or "guest"
        started_at = datetime.utcnow()
        attachment = None
        if image:
            print(f"[INFO] Processing uploaded image: {image.filename}")
            attachment = await process_uploaded_image(image)
            print(f"[INFO] Image processed successfully,type: {attachment['type']}")

        # Log the incoming request
        print(f"\n{'='*60}")
        print(f"[REQUEST] {datetime.now().isoformat()}")
        print(f"  Question: {text[:100]}...")
        print(f"  Attachment: {attachment is not None}")
        print(f"{'='*60}")
        
        
        # Call the AI orchestrator - returns AcademicResponse format
        print("[INFO] Calling orchestrator...")
        result = ask_math_ai(text, attachment=attachment)
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
                problemStatement=result.get('problemStatement', text),
                steps=steps,
                conclusion=result.get('conclusion')
            )

            elapsed_ms = int((datetime.utcnow() - started_at).total_seconds() * 1000)
            retrieved_sources = result.get('sources') if isinstance(result, dict) else []
            retrieved_ids = []
            similarity_scores = []
            if isinstance(retrieved_sources, list):
                for source in retrieved_sources:
                    if isinstance(source, dict):
                        sid = source.get('id') or source.get('source')
                        if sid:
                            retrieved_ids.append(str(sid))
                        score = source.get('score')
                        if isinstance(score, (int, float)):
                            similarity_scores.append(float(score))

            _log_interaction({
                "user_id": user_id or "guest",
                "timestamp": datetime.utcnow().isoformat(),
                "student_question": text,
                "retrieved_documents": retrieved_ids,
                "retrieved_similarity_scores": similarity_scores,
                "model_answer": response_data.conclusion or (response_data.steps[0].explanation if response_data.steps else ""),
                "response_latency_ms": elapsed_ms,
                "topic": _classify_topic(text),
                "question_type": _question_type(text),
                "difficulty": _difficulty_level(text),
                "correctness_flag": None,
                "error_flags": [],
                "source": "ask"
            })
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
        print(f"  Question: {text[:100]}...")
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
async def ask_stream_endpoint(http_req: Request):
    """Streaming endpoint - SSE format

    Accepts both JSON (QuestionRequest) and FormData (text + optional image) formats.
    Accepts optional session headers (X-Session-Id or Authorization: Bearer <token>) and will attempt
    to charge the user's credits on successful completion of the stream. Returns a 'charged' SSE event
    with remaining credits if the server performed the charge.
    """

    # Determine content type
    content_type = http_req.headers.get("content-type", "").lower()

    question_text = None
    attachment = None
    user_id_from_request = "guest"
    request_received_at = datetime.utcnow()

    if "multipart/form-data" in content_type:
        # Handle FormData input
        form = await http_req.form()
        text = form.get("text")
        image = form.get("image")
        user_id_from_request = str(form.get("user_id") or "guest")
        if text:
            question_text = text
            if image and isinstance(image, UploadFile):
                print(f"[STREAM] Processing uploaded image: {image.filename} (content_type={image.content_type})")
                attachment = await process_uploaded_image(image)
                print(f"[STREAM] Image processed successfully, type: {attachment['type']}, bytes={len(attachment['image'])}")
            else:
                print("[STREAM] No image file found in multipart form")
        else:
            raise HTTPException(status_code=400, detail="FormData must include 'text' field")
    elif "application/json" in content_type:
        # Handle JSON input
        try:
            json_data = await http_req.json()
            question_request = QuestionRequest(**json_data)
            question_text = question_request.text
            user_id_from_request = question_request.user_id or "guest"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON request: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Content-Type must be multipart/form-data or application/json")

    if not question_text:
        raise HTTPException(status_code=400, detail="Question text is required")

    request_id = f"stream-{uuid.uuid4().hex[:8]}"

    print(f"\n[STREAM] {request_id} Question: {question_text}")
    if attachment:
        print(f"[STREAM] {request_id} With attachment: {attachment['type']}")

    def generate():  # NOT async - your orchestrator is sync!
        chunk_count = 0
        final_conclusion = ""
        stream_sources = []
        stream_error_flags = []
        try:
            # Send connection
            yield ": connected\n\n"

            # Get stream from orchestrator (it's a regular generator, not async)
            for ndjson_line in ask_math_ai_stream(question_text, history="", attachment=attachment):
                # Parse the NDJSON line
                line = ndjson_line.strip()
                if not line:
                    continue
                
                try:
                    chunk_obj = json.loads(line)
                    chunk_type = chunk_obj.get("type", "")

                    # NEW orchestrator format (token/metadata/done)
                    if "token" in chunk_obj:
                        text = chunk_obj.get("token") or ""
                        if text:
                            chunk_count += 1
                            yield f"data: {json.dumps({'token': text})}\n\n"
                            print(f"→ Chunk {chunk_count}: {text[:30]}")
                        continue

                    if "metadata" in chunk_obj:
                        metadata = chunk_obj.get("metadata") or {}
                        if isinstance(metadata, dict) and isinstance(metadata.get("sources"), list):
                            stream_sources = metadata.get("sources")
                        yield f"data: {json.dumps({'metadata': metadata})}\n\n"
                        continue

                    if "done" in chunk_obj:
                        final_conclusion = chunk_obj.get("conclusion", "") or final_conclusion
                        if isinstance(chunk_obj.get("sources"), list):
                            stream_sources = chunk_obj.get("sources")
                        yield f"data: {json.dumps({'done': True, 'conclusion': final_conclusion, 'sources': stream_sources})}\n\n"
                        continue

                    # OLD orchestrator format (type-based)
                    if chunk_type == "chunk":
                        text = chunk_obj.get("text", "")
                        if text:
                            chunk_count += 1
                            # Send as SSE - frontend expects {token: text}
                            yield f"data: {json.dumps({'token': text})}\n\n"
                            print(f"→ Chunk {chunk_count}: {text[:30]}")

                    elif chunk_type == "start":
                        # Send metadata - frontend expects {metadata: chunk_obj}
                        if isinstance(chunk_obj.get("sources"), list):
                            stream_sources = chunk_obj.get("sources")
                        yield f"data: {json.dumps({'metadata': chunk_obj})}\n\n"

                    elif chunk_type == "end":
                        # Send conclusion - frontend expects {conclusion: text}
                        final_conclusion = chunk_obj.get('conclusion', '')
                        yield f"data: {json.dumps({'conclusion': final_conclusion})}\n\n"
                    
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
                        user_id_verified = user_id_from_request
                    else:
                        if CLERK_API_KEY:
                            user_id_verified = _verify_clerk_session(session_token)
                        else:
                            user_id_verified = user_id_from_request

                    if user_id_verified:
                        print(f"[CREDITS] {request_id} Attempting server-side charge for user: {user_id_verified}")
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
                            print(f"[CREDITS] {request_id} No credits remaining for user: {user_id_verified}")
                        else:
                            # Inform client of remaining credits so UI can be updated
                            yield f"data: {json.dumps({'charged': True, 'remaining': rec['remaining']})}\n\n"
                            print(f"[CREDITS] {request_id} Charged user {user_id_verified}, remaining={rec['remaining']}")
            except Exception as e:
                print(f"[CREDITS] {request_id} Server-side charge failed: {e}")

            # Send done
            yield f"data: {json.dumps({'done': True})}\n\n"
            print(f"✅ {request_id} Complete - {chunk_count} chunks")

            elapsed_ms = int((datetime.utcnow() - request_received_at).total_seconds() * 1000)
            retrieved_ids = []
            similarity_scores = []
            if isinstance(stream_sources, list):
                for source in stream_sources:
                    if isinstance(source, dict):
                        sid = source.get('id') or source.get('source')
                        if sid:
                            retrieved_ids.append(str(sid))
                        score = source.get('score')
                        if isinstance(score, (int, float)):
                            similarity_scores.append(float(score))

            _log_interaction({
                "user_id": user_id_from_request or "guest",
                "timestamp": datetime.utcnow().isoformat(),
                "student_question": question_text,
                "retrieved_documents": retrieved_ids,
                "retrieved_similarity_scores": similarity_scores,
                "model_answer": final_conclusion,
                "response_latency_ms": elapsed_ms,
                "topic": _classify_topic(question_text),
                "question_type": _question_type(question_text),
                "difficulty": _difficulty_level(question_text),
                "correctness_flag": None,
                "error_flags": stream_error_flags,
                "source": "ask-stream"
            })
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            stream_error_flags.append("runtime_error")
            elapsed_ms = int((datetime.utcnow() - request_received_at).total_seconds() * 1000)
            _log_interaction({
                "user_id": user_id_from_request or "guest",
                "timestamp": datetime.utcnow().isoformat(),
                "student_question": question_text,
                "retrieved_documents": [],
                "retrieved_similarity_scores": [],
                "model_answer": final_conclusion,
                "response_latency_ms": elapsed_ms,
                "topic": _classify_topic(question_text),
                "question_type": _question_type(question_text),
                "difficulty": _difficulty_level(question_text),
                "correctness_flag": False,
                "error_flags": stream_error_flags,
                "source": "ask-stream"
            })
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
ANALYTICS_INTERACTIONS_FILE = os.path.join(STORAGE_DIR, "analytics_interactions.json")
ANALYTICS_FEEDBACK_FILE = os.path.join(STORAGE_DIR, "analytics_feedback.json")
ANALYTICS_EVENTS_FILE = os.path.join(STORAGE_DIR, "analytics_events.json")
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

# Load email whitelist from environment
WHITELIST_EMAILS = set()
whitelist_env = os.environ.get('WHITELIST_EMAILS', '')
if whitelist_env:
    WHITELIST_EMAILS = set(email.strip().lower() for email in whitelist_env.split(',') if email.strip())
    print(f'[WHITELIST] Loaded {len(WHITELIST_EMAILS)} whitelisted emails')
else:
    print('[WHITELIST] No whitelist configured; all signed-up users will have access')

# Load admin email allowlist from environment
ADMIN_EMAILS = set()
admin_emails_env = os.environ.get('ADMIN_EMAILS', '')
if admin_emails_env:
    ADMIN_EMAILS = set(email.strip().lower() for email in admin_emails_env.split(',') if email.strip())
    print(f'[ADMIN] Loaded {len(ADMIN_EMAILS)} admin emails')
else:
    print('[ADMIN] No ADMIN_EMAILS configured; admin dashboard access is disabled by default')

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


def _classify_topic(question: str) -> str:
    if not question:
        return "Unknown"
    q = question.lower()
    topic_patterns = {
        "Algebra": r"equation|solve for x|polynomial|factor|linear|quadratic|inequal",
        "Geometry": r"triangle|circle|angle|area|perimeter|volume|parallel|polygon",
        "Trigonometry": r"sin|cos|tan|cot|sec|csc|trig|radian",
        "Calculus": r"derivative|integral|limit|differentiat|continuity|tangent",
        "Statistics": r"probability|mean|median|variance|standard deviation|distribution",
    }
    for topic, pattern in topic_patterns.items():
        if re.search(pattern, q):
            return topic
    return "General Math"


def _question_type(question: str) -> str:
    if not question:
        return "unknown"
    q = question.lower()
    if "prove" in q or "show that" in q:
        return "proof"
    if any(k in q for k in ["explain", "why", "how"]):
        return "conceptual"
    if any(k in q for k in ["word problem", "story", "train", "distance", "speed"]):
        return "word_problem"
    if any(k in q for k in ["graph", "plot"]):
        return "graphing"
    return "computation"


def _difficulty_level(question: str) -> str:
    if not question:
        return "medium"
    q = question.lower()
    score = 0
    if len(q) > 120:
        score += 1
    if any(k in q for k in ["integral", "derivative", "proof", "matrix", "vector", "probability"]):
        score += 1
    if any(k in q for k in ["step by step", "explain", "reason"]):
        score += 1
    if score <= 1:
        return "easy"
    if score == 2:
        return "medium"
    return "hard"


def _to_dt(value):
    if value is None:
        return None
    try:
        if isinstance(value, (int, float)):
            if value > 1e12:
                return datetime.utcfromtimestamp(value / 1000)
            return datetime.utcfromtimestamp(value)
        if isinstance(value, str):
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if parsed.tzinfo is not None:
                return parsed.astimezone(tz=None).replace(tzinfo=None)
            return parsed
    except Exception:
        return None
    return None


def _append_record(path: str, record: dict):
    payload = _load_json(path, [])
    if not isinstance(payload, list):
        payload = []
    payload.append(record)
    _save_json(path, payload)


def _log_interaction(record: dict):
    interaction = dict(record)
    interaction["id"] = interaction.get("id") or f"ix-{uuid.uuid4().hex[:12]}"
    interaction["timestamp"] = interaction.get("timestamp") or datetime.utcnow().isoformat()
    _append_record(ANALYTICS_INTERACTIONS_FILE, interaction)


def _log_feedback(record: dict):
    payload = dict(record)
    payload["id"] = payload.get("id") or f"fb-{uuid.uuid4().hex[:12]}"
    payload["timestamp"] = payload.get("timestamp") or datetime.utcnow().isoformat()
    _append_record(ANALYTICS_FEEDBACK_FILE, payload)


def _log_event(record: dict):
    payload = dict(record)
    payload["id"] = payload.get("id") or f"ev-{uuid.uuid4().hex[:12]}"
    payload["timestamp"] = payload.get("timestamp") or datetime.utcnow().isoformat()
    _append_record(ANALYTICS_EVENTS_FILE, payload)


def _safe_pct(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100.0, 2)


def _is_admin_email(email: str) -> bool:
    if not email:
        return False
    if not ADMIN_EMAILS:
        return False
    return email.strip().lower() in ADMIN_EMAILS


# --- File-backed sync helpers (used by async wrappers) ---
def _benin_today_iso():
    try:
        if ZoneInfo:
            return datetime.now(ZoneInfo("Africa/Porto-Novo")).date().isoformat()
    except Exception:
        pass
    return datetime.utcnow().date().isoformat()

def get_credits_record(user_id: str):
    records = _load_json(CREDITS_FILE, {})
    today = _benin_today_iso()
    rec = records.get(user_id)
    if not rec or rec.get('lastReset') < today:
        rec = {'remaining': DEFAULT_CREDITS, 'lastReset': today}
        records[user_id] = rec
        _save_json(CREDITS_FILE, records)
    return rec


def spend_credit_record(user_id: str):
    records = _load_json(CREDITS_FILE, {})
    rec = records.get(user_id) or {'remaining': DEFAULT_CREDITS, 'lastReset': _benin_today_iso()}
    if rec.get('remaining', 0) <= 0:
        return None
    rec['remaining'] = rec.get('remaining', 0) - 1
    records[user_id] = rec
    _save_json(CREDITS_FILE, records)
    return rec


def reset_all_credits():
    today = _benin_today_iso()
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
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None
import uuid
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


def _get_clerk_user_primary_email(user_id: str) -> Optional[str]:
    if not CLERK_API_KEY or not user_id:
        return None
    try:
        url = f"{CLERK_API_BASE}/users/{user_id}"
        headers = {"Authorization": f"Bearer {CLERK_API_KEY}"}
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code != 200:
            return None
        data = r.json() or {}
        primary_email_id = data.get("primary_email_address_id")
        emails = data.get("email_addresses") or []
        for item in emails:
            if item.get("id") == primary_email_id:
                return (item.get("email_address") or "").strip().lower() or None
        if emails:
            return (emails[0].get("email_address") or "").strip().lower() or None
    except Exception:
        return None
    return None


# Async wrappers for credits (works with either MongoDB or JSON files)
import asyncio

async def _get_credits_record_async(user_id: str):
    today = _benin_today_iso()

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
    today = _benin_today_iso()
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
        # Update each conversation using upsert to avoid duplicate key errors
        # This prevents E11000 errors when updating existing conversations
        if conversations:
            for c in conversations:
                c_copy = dict(c)
                # Remove any pre-existing Mongo _id to avoid duplicate key insert errors
                c_copy.pop('_id', None)
                c_copy['user_id'] = user_id
                # Use update_one with upsert=True to update if exists, insert if new
                # This prevents duplicate key errors when conversation already exists
                await conversations_coll.update_one(
                    {'user_id': user_id, 'id': c_copy.get('id')},  # Match by user_id and conversation id
                    {'$set': c_copy},  # Update all fields
                    upsert=True  # Insert if doesn't exist
                )
        else:
            # If no conversations, clear them for this user
            await conversations_coll.delete_many({'user_id': user_id})
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


# API: Whitelist verification endpoint
class EmailVerifyRequest(BaseModel):
    email: str = Field(..., description="Email to verify against whitelist")


@api_router.post("/verify-whitelist")
async def verify_whitelist(req: EmailVerifyRequest):
    """
    Verify if an email is on the whitelist.
    Returns {allowed: True} if whitelisted or no whitelist configured,
    else {allowed: False, reason: '...'}
    """
    if not WHITELIST_EMAILS:
        # No whitelist configured; all users allowed
        return {"allowed": True}
    
    email_lower = req.email.strip().lower()
    if email_lower in WHITELIST_EMAILS:
        return {"allowed": True}
    else:
        return {
            "allowed": False,
            "reason": "Votre adresse e-mail n’est pas autorisée à accéder à cette application. Veuillez contacter l’administrateur.."
        }


@api_router.post("/verify-admin")
async def verify_admin(req: EmailVerifyRequest):
    """
    Verify if an email is authorized to access admin routes.
    Returns {allowed: True} only when email is in ADMIN_EMAILS.
    Secure default: deny when ADMIN_EMAILS is not configured.
    """
    if not ADMIN_EMAILS:
        return {
            "allowed": False,
            "reason": "Admin access is not configured. Please contact the administrator."
        }

    email_lower = req.email.strip().lower()
    if email_lower in ADMIN_EMAILS:
        return {"allowed": True}

    return {
        "allowed": False,
        "reason": "You do not have permission to access the admin dashboard."
    }


@api_router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    topic = req.topic or "General Math"
    _log_feedback({
        "solution_id": req.solutionId,
        "type": req.type,
        "timestamp": datetime.utcfromtimestamp(req.timestamp / 1000).isoformat() if req.timestamp else datetime.utcnow().isoformat(),
        "user_id": req.userId or "guest",
        "topic": topic,
        "additional_comments": req.additionalComments,
    })
    return {"success": True, "message": "Feedback received"}


@api_router.post("/analytics/event")
async def track_analytics_event(req: AnalyticsEventRequest):
    _log_event({
        "event_type": req.eventType,
        "solution_id": req.solutionId,
        "response_time": req.responseTime,
        "timestamp": datetime.utcfromtimestamp(req.timestamp / 1000).isoformat() if req.timestamp else datetime.utcnow().isoformat(),
        "user_id": req.userId or "guest",
        "topic": req.topic,
    })
    return {"success": True}


@api_router.get("/admin/metrics")
async def get_admin_metrics(request: Request, email: str = "", days: int = 30):
    session_header = request.headers.get('x-session-id') or request.headers.get('authorization')
    resolved_email = None

    if session_header:
        if session_header.lower().startswith('bearer '):
            session_token = session_header.split(' ', 1)[1]
        else:
            session_token = session_header

        if DEV_SKIP_CLERK_VERIFY:
            resolved_email = (email or "").strip().lower() or None
        else:
            user_id_verified = _verify_clerk_session(session_token)
            if not user_id_verified:
                raise HTTPException(status_code=401, detail="Invalid session")
            resolved_email = _get_clerk_user_primary_email(user_id_verified)
    else:
        if not DEV_SKIP_CLERK_VERIFY:
            raise HTTPException(status_code=401, detail="Missing session header")
        resolved_email = (email or "").strip().lower() or None

    effective_email = resolved_email or (email or "").strip().lower()
    if not _is_admin_email(effective_email):
        raise HTTPException(status_code=403, detail="Admin access required")

    days = max(1, min(days, 180))
    now = datetime.utcnow()
    since = now - timedelta(days=days)

    interactions = _load_json(ANALYTICS_INTERACTIONS_FILE, [])
    feedback = _load_json(ANALYTICS_FEEDBACK_FILE, [])
    events = _load_json(ANALYTICS_EVENTS_FILE, [])

    if not isinstance(interactions, list):
        interactions = []
    if not isinstance(feedback, list):
        feedback = []
    if not isinstance(events, list):
        events = []

    recent_interactions = [
        x for x in interactions
        if _to_dt(x.get("timestamp")) and _to_dt(x.get("timestamp")) >= since
    ]
    recent_feedback = [
        x for x in feedback
        if _to_dt(x.get("timestamp")) and _to_dt(x.get("timestamp")) >= since
    ]

    total_questions = len(recent_interactions)
    latencies = [float(x.get("response_latency_ms", 0)) for x in recent_interactions if isinstance(x.get("response_latency_ms"), (int, float))]
    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0

    users_all = [str(x.get("user_id", "guest")) for x in recent_interactions]
    unique_users = set(users_all)

    start_today = datetime(now.year, now.month, now.day)
    start_week = start_today - timedelta(days=7)
    dau = len({str(x.get("user_id", "guest")) for x in recent_interactions if _to_dt(x.get("timestamp")) and _to_dt(x.get("timestamp")) >= start_today})
    wau = len({str(x.get("user_id", "guest")) for x in recent_interactions if _to_dt(x.get("timestamp")) and _to_dt(x.get("timestamp")) >= start_week})

    feedback_types = Counter([str(x.get("type", "")).lower() for x in recent_feedback])
    helpful = feedback_types.get("helpful", 0)
    incorrect = feedback_types.get("incorrect", 0)
    satisfaction = _safe_pct(helpful, helpful + incorrect)

    correctness_values = [x.get("correctness_flag") for x in recent_interactions if isinstance(x.get("correctness_flag"), bool)]
    if correctness_values:
        correct_count = sum(1 for v in correctness_values if v)
        overall_accuracy = _safe_pct(correct_count, len(correctness_values))
    else:
        overall_accuracy = satisfaction

    daily_counts = defaultdict(int)
    hourly_counts = defaultdict(int)
    user_counts = Counter()
    topic_counts = Counter()
    topic_correct = defaultdict(int)
    topic_total = defaultdict(int)
    retrieval_doc_count = []
    retrieval_failures = 0
    similarity_scores = []
    error_patterns = Counter()
    logs_with_topic = 0
    logs_with_retrieval = 0
    logs_with_latency = 0
    logs_with_model_answer = 0

    for item in recent_interactions:
        dt = _to_dt(item.get("timestamp"))
        if not dt:
            continue
        day_key = dt.date().isoformat()
        daily_counts[day_key] += 1
        hourly_counts[dt.hour] += 1

        uid = str(item.get("user_id", "guest"))
        user_counts[uid] += 1

        topic = str(item.get("topic") or "General Math")
        topic_counts[topic] += 1
        logs_with_topic += 1 if item.get("topic") else 0

        if isinstance(item.get("response_latency_ms"), (int, float)):
            logs_with_latency += 1
        if item.get("model_answer"):
            logs_with_model_answer += 1

        correctness = item.get("correctness_flag")
        if isinstance(correctness, bool):
            topic_total[topic] += 1
            if correctness:
                topic_correct[topic] += 1

        docs = item.get("retrieved_documents")
        if isinstance(docs, list):
            logs_with_retrieval += 1
            retrieval_doc_count.append(len(docs))
            if len(docs) == 0:
                retrieval_failures += 1
        else:
            retrieval_failures += 1

        scores = item.get("retrieved_similarity_scores")
        if isinstance(scores, list):
            similarity_scores.extend([float(s) for s in scores if isinstance(s, (int, float))])

        flags = item.get("error_flags") or []
        if isinstance(flags, list):
            for f in flags:
                error_patterns[str(f)] += 1

    avg_retrieved_docs = round(sum(retrieval_doc_count) / len(retrieval_doc_count), 2) if retrieval_doc_count else 0
    retrieval_failure_rate = _safe_pct(retrieval_failures, len(recent_interactions)) if recent_interactions else 0

    repeat_users = sum(1 for _, count in user_counts.items() if count > 1)
    repeat_usage_rate = _safe_pct(repeat_users, len(user_counts)) if user_counts else 0
    questions_per_student = round(total_questions / len(user_counts), 2) if user_counts else 0

    question_type_counter = Counter([str(x.get("question_type") or "unknown") for x in recent_interactions])
    difficulty_counter = Counter([str(x.get("difficulty") or "unknown") for x in recent_interactions])

    topic_accuracy = []
    for topic, count in topic_counts.items():
        if topic_total.get(topic, 0) > 0:
            acc = _safe_pct(topic_correct[topic], topic_total[topic])
        else:
            acc = overall_accuracy
        topic_accuracy.append({"topic": topic, "count": count, "accuracy": acc})
    topic_accuracy.sort(key=lambda x: x["count"], reverse=True)

    feedback_by_topic = defaultdict(lambda: {"helpful": 0, "incorrect": 0})
    for fb in recent_feedback:
        topic = str(fb.get("topic") or "General Math")
        ftype = str(fb.get("type") or "").lower()
        if ftype in ("helpful", "incorrect"):
            feedback_by_topic[topic][ftype] += 1

    day_cursor = since.date()
    per_day_keys = []
    while day_cursor <= now.date():
        per_day_keys.append(day_cursor.isoformat())
        day_cursor += timedelta(days=1)

    accuracy_trend = []
    feedback_trend = []
    latency_trend = []
    for key in per_day_keys:
        subset = [x for x in recent_interactions if _to_dt(x.get("timestamp")) and _to_dt(x.get("timestamp")).date().isoformat() == key]
        subset_feedback = [x for x in recent_feedback if _to_dt(x.get("timestamp")) and _to_dt(x.get("timestamp")).date().isoformat() == key]
        sub_correct = [x.get("correctness_flag") for x in subset if isinstance(x.get("correctness_flag"), bool)]
        if sub_correct:
            acc = _safe_pct(sum(1 for c in sub_correct if c), len(sub_correct))
        else:
            h = sum(1 for x in subset_feedback if str(x.get("type", "")).lower() == "helpful")
            i = sum(1 for x in subset_feedback if str(x.get("type", "")).lower() == "incorrect")
            acc = _safe_pct(h, h + i)
        sub_lat = [float(x.get("response_latency_ms", 0)) for x in subset if isinstance(x.get("response_latency_ms"), (int, float))]
        h = sum(1 for x in subset_feedback if str(x.get("type", "")).lower() == "helpful")
        i = sum(1 for x in subset_feedback if str(x.get("type", "")).lower() == "incorrect")
        accuracy_trend.append({"date": key, "value": acc})
        feedback_trend.append({"date": key, "value": _safe_pct(h, h + i)})
        latency_trend.append({"date": key, "value": round(sum(sub_lat) / len(sub_lat), 2) if sub_lat else 0})

    similarity_distribution = {
        "0.90-1.00": 0,
        "0.80-0.89": 0,
        "0.70-0.79": 0,
        "<0.70": 0,
    }
    for s in similarity_scores:
        if s >= 0.9:
            similarity_distribution["0.90-1.00"] += 1
        elif s >= 0.8:
            similarity_distribution["0.80-0.89"] += 1
        elif s >= 0.7:
            similarity_distribution["0.70-0.79"] += 1
        else:
            similarity_distribution["<0.70"] += 1

    top_errors = [{"pattern": k, "count": v} for k, v in error_patterns.most_common(8)]
    sample_problematic = []
    for item in recent_interactions:
        flags = item.get("error_flags")
        if isinstance(flags, list) and flags:
            sample_problematic.append({
                "timestamp": item.get("timestamp"),
                "topic": item.get("topic"),
                "question": (item.get("student_question") or "")[:180],
                "error_flags": flags,
            })
        if len(sample_problematic) >= 5:
            break

    safety_flags = Counter()
    for item in recent_interactions:
        flags = item.get("error_flags") or []
        if isinstance(flags, list):
            for flag in flags:
                f = str(flag).lower()
                if "harm" in f or "policy" in f or "bypass" in f or "misuse" in f:
                    safety_flags[f] += 1

    peak_hours = [{"hour": h, "count": c} for h, c in sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)[:6]]
    questions_per_day = [{"date": d, "count": daily_counts.get(d, 0)} for d in per_day_keys]

    return {
        "overview": {
            "totalQuestions": total_questions,
            "dau": dau,
            "wau": wau,
            "avgResponseTimeMs": avg_latency,
            "overallAccuracyRate": overall_accuracy,
            "userSatisfactionRate": satisfaction,
        },
        "usage": {
            "questionsPerDay": questions_per_day,
            "peakUsageHours": peak_hours,
            "questionsPerStudent": questions_per_student,
            "repeatUsageRate": repeat_usage_rate,
            "activeUsers": len(unique_users),
        },
        "quality": {
            "correctAnswersPct": overall_accuracy,
            "incorrectAnswersPct": round(100 - overall_accuracy, 2),
            "accuracyByTopic": topic_accuracy,
            "accuracyOverTime": accuracy_trend,
            "teacherReviewedSampleAccuracy": overall_accuracy,
            "modelEvaluatedCorrectness": overall_accuracy,
        },
        "retrieval": {
            "avgRetrievedDocuments": avg_retrieved_docs,
            "retrievalFailureRate": retrieval_failure_rate,
            "similarityDistribution": similarity_distribution,
            "incorrectAnswerRetrievalCorrectRate": 0,
        },
        "topicAnalysis": {
            "mostAskedTopics": topic_accuracy[:5],
            "leastAskedTopics": sorted(topic_accuracy, key=lambda x: x["count"])[:5],
            "lowestPerformingTopic": sorted(topic_accuracy, key=lambda x: x["accuracy"])[0] if topic_accuracy else None,
            "feedbackByTopic": [{"topic": t, **v} for t, v in feedback_by_topic.items()],
        },
        "errors": {
            "topFailurePatterns": top_errors,
            "sampleProblematicLogs": sample_problematic,
        },
        "trends": {
            "accuracyTrend": accuracy_trend,
            "feedbackTrend": feedback_trend,
            "latencyTrend": latency_trend,
        },
        "aiLayer": {
            "accuracyByDifficulty": [{"level": k, "count": v} for k, v in difficulty_counter.items()],
            "errorRateByQuestionType": [{"type": k, "count": v} for k, v in question_type_counter.items()],
            "hallucinationRate": _safe_pct(error_patterns.get("hallucination", 0), total_questions if total_questions else 1),
            "logicalConsistencyRate": round(max(0, 100 - _safe_pct(error_patterns.get("logical_inconsistency", 0), total_questions if total_questions else 1)), 2),
            "mathVerificationMismatchRate": _safe_pct(error_patterns.get("verification_mismatch", 0), total_questions if total_questions else 1),
            "userFlaggedAnswers": incorrect,
            "reaskedQuestionsFrequency": _safe_pct(sum(1 for e in events if str(e.get("event_type")) == "problem_submitted"), max(1, total_questions)),
        },
        "system": {
            "apiLatencyMs": avg_latency,
            "modelInferenceMs": avg_latency,
            "errorRate": _safe_pct(sum(v for _, v in error_patterns.items()), max(1, total_questions)),
            "queueBacklog": 0,
            "gpuUtilization": 0,
            "totalQueriesPerDay": round(total_questions / max(1, days), 2),
            "peakUsageHours": peak_hours,
        },
        "safety": {
            "harmfulPromptDetectionCount": sum(v for k, v in safety_flags.items() if "harm" in k),
            "bypassAttempts": sum(v for k, v in safety_flags.items() if "bypass" in k),
            "policyViolationAttempts": sum(v for k, v in safety_flags.items() if "policy" in k),
            "suspiciousUsageSpikes": 0,
            "accountMisusePatterns": sum(v for k, v in safety_flags.items() if "misuse" in k),
        },
        "loggingCoverage": {
            "interactionCount": total_questions,
            "topicCoveragePct": _safe_pct(logs_with_topic, max(1, total_questions)),
            "retrievalCoveragePct": _safe_pct(logs_with_retrieval, max(1, total_questions)),
            "latencyCoveragePct": _safe_pct(logs_with_latency, max(1, total_questions)),
            "modelAnswerCoveragePct": _safe_pct(logs_with_model_answer, max(1, total_questions)),
        },
        "meta": {
            "days": days,
            "generatedAt": datetime.utcnow().isoformat(),
            "dataSources": {
                "interactions": len(interactions),
                "feedback": len(feedback),
                "events": len(events),
            },
        },
    }


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
        return {"user_id": user_id, "remaining": DEFAULT_CREDITS, "lastReset": _benin_today_iso()}


@api_router.post("/credits/{user_id}/spend")
async def api_spend_credit(user_id: str, request: Request):
    request_id = f"spend-{uuid.uuid4().hex[:8]}"
    print(f"[CREDITS] {request_id} /spend called for user_id={user_id}")
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
        print(f"[CREDITS] {request_id} No credits remaining for user: {user_id_verified}")
        raise HTTPException(status_code=402, detail="No credits remaining")
    print(f"[CREDITS] {request_id} Charged user {user_id_verified}, remaining={rec['remaining']}")
    return {"user_id": user_id_verified, "remaining": rec["remaining"]} 


@api_router.post("/credits/{user_id}/reset")
async def api_reset_credits(user_id: str):
    # Admin-style reset; require ADMIN_RESET_KEY env var
    ADMIN_RESET_KEY = os.environ.get('ADMIN_RESET_KEY')
    if not ADMIN_RESET_KEY:
        raise HTTPException(status_code=403, detail='Reset not allowed')

    # Perform reset in the underlying storage
    today = _benin_today_iso()
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
@api_router.get("/health", response_model=HealthResponse)
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
    try:
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
    except Exception as e:
        print(f"[STARTUP ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise

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
