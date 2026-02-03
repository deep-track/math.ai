"""
Math.AI FastAPI Backend Server

This server connects the AI logic (orchestrator.py) to the React frontend.
Run with: uvicorn src.api.server:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os
import json
from datetime import datetime

# Create an API router for grouped endpoints (e.g., credits)
api_router = APIRouter(prefix="/api")

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

# 3. CORS Configuration - Allow frontend to communicate
# Load allowed origins from environment to support multiple deployments
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
    "http://192.168.0.101:5173",
    "http://192.168.0.101:5174",
    "http://192.168.0.101:5175",
    "http://192.168.0.101:3000",
    "https://deep-track-mathai.vercel.app",
    "https://www.mathai.fr",
]

# Allow overriding via environment variable FRONTEND_ORIGINS (comma separated)
env_origins = os.getenv("FRONTEND_ORIGINS")
if env_origins:
    # split and strip whitespace
    origins = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    origins = DEFAULT_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
@app.post("/ask", response_model=AcademicResponseModel)
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
@app.post("/ask-stream")
async def ask_stream_endpoint(request: QuestionRequest, http_req: Request):
    """Streaming endpoint - SSE format"""
    
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
                            # Send as SSE
                            yield f"data: {json.dumps({'token': text})}\n\n"
                            print(f"→ Chunk {chunk_count}: {text[:30]}")
                    
                    elif chunk_type == "start":
                        # Send metadata
                        yield f"data: {json.dumps({'metadata': chunk_obj})}\n\n"
                    
                    elif chunk_type == "end":
                        yield f"data: {json.dumps({'conclusion': chunk_obj.get('conclusion', '')})}\n\n"
                    
                except json.JSONDecodeError:
                    continue
            
            # After successful stream, attempt server-side charge if a session header exists
            try:
                session_header = http_req.headers.get('x-session-id') or http_req.headers.get('authorization')
                if session_header:
                    # Extract token if Bearer
                    if session_header.lower().startswith('bearer '):
                        session_token = session_header.split(' ', 1)[1]
                    else:
                        session_token = session_header

                    user_id = request.user_id or 'guest'
                    # Attempt to spend a credit on behalf of the user
                    rec = None
                    try:
                        rec = asyncio.get_event_loop().run_until_complete(_spend_credit_record_async(user_id))
                    except Exception:
                        # Fallback to synchronous helper
                        rec = spend_credit_record(user_id)

                    if rec is None:
                        # Inform client that there were no credits
                        yield f"data: {json.dumps({'error': 'No credits remaining'})}\n\n"
                        print(f"[CREDITS] No credits remaining for user: {user_id}")
                    else:
                        # Inform client of remaining credits so UI can be updated
                        yield f"data: {json.dumps({'charged': True, 'remaining': rec['remaining']})}\n\n"
                        print(f"[CREDITS] Charged user {user_id}, remaining={rec['remaining']}")
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
        }
    )

# --- Simple credits storage and endpoints ---
STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR, exist_ok=True)

CREDITS_FILE = os.path.join(STORAGE_DIR, "credits.json")
DEFAULT_CREDITS = 100

# Simple JSON helpers
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


# Async wrappers
import asyncio

async def _get_credits_record_async(user_id: str):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_credits_record, user_id)


async def _spend_credit_record_async(user_id: str):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, spend_credit_record, user_id)


@api_router.get("/credits/{user_id}")
async def api_get_credits(user_id: str):
    rec = await _get_credits_record_async(user_id)
    return {"user_id": user_id, "remaining": rec["remaining"], "lastReset": rec["lastReset"]}


@api_router.post("/credits/{user_id}/spend")
async def api_spend_credit(user_id: str):
    rec = await _spend_credit_record_async(user_id)
    if rec is None:
        raise HTTPException(status_code=402, detail="No credits remaining")
    return {"user_id": user_id, "remaining": rec["remaining"]}

# Midnight reset background task (Europe/Paris when available)
from datetime import timedelta
try:
    from zoneinfo import ZoneInfo
    PARIS_TZ = ZoneInfo('Europe/Paris')
except Exception:
    from datetime import timezone
    PARIS_TZ = timezone(timedelta(hours=1))
    print("[CREDITS] zoneinfo not available; falling back to fixed CET (UTC+1). Install tzdata for DST-aware behavior.")

async def _midnight_reset_loop():
    while True:
        now = datetime.now(tz=PARIS_TZ)
        tomorrow = (now + timedelta(days=1)).date()
        midnight = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0, tzinfo=PARIS_TZ)
        seconds = (midnight - now).total_seconds() + 1
        print(f"[CREDITS] Sleeping {int(seconds)}s until next Paris midnight reset (next at {midnight.isoformat()})")
        await asyncio.sleep(seconds)
        try:
            await asyncio.get_running_loop().run_in_executor(None, reset_all_credits)
            print("[CREDITS] Reset all credits to default at Paris midnight (Europe/Paris)")
        except Exception as e:
            print("[CREDITS] Error resetting credits:", e)

# Start background reset loop on startup (avoid creating tasks at import time)
# The task will be scheduled from the startup event below.

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
    return {
        "success": False,
        "error": str(exc),
        "timestamp": datetime.now().isoformat()
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on server startup"""
    print("\n" + "="*60)
    print("Math.AI Backend Starting...")
    print("✓ FastAPI server initialized")
    print("✓ CORS enabled for frontend communication")
    print("✓ AI orchestrator ready")
    print("\nAPI Documentation available at:")
    print("   http://localhost:8000/docs")
    print("   http://localhost:8000/redoc")
    print("\nReady to process questions!")
    print("="*60 + "\n")

    # Start midnight reset background task
    try:
        asyncio.create_task(_midnight_reset_loop())
    except Exception as e:
        print('[CREDITS] Failed to start midnight reset task:', e)

# Include API router for grouped endpoints
app.include_router(api_router)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on server shutdown"""
    print("\n" + "="*60)
    print(" Math.AI Backend Shutting Down...")
    print("="*60 + "\n")

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
