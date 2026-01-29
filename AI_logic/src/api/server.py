"""
Math.AI FastAPI Backend Server

This server connects the AI logic (orchestrator.py) to the React frontend.
Run with: uvicorn src.api.server:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os
import json
from datetime import datetime

# 1. Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 2. Import the AI orchestrator
from src.engine.orchestrator import ask_math_ai

# Initialize FastAPI app
app = FastAPI(
    title="Math.AI Backend",
    description="Backend API for the Math.AI tutor application",
    version="1.0.0"
)

# 3. CORS Configuration - Allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite dev server
        "http://localhost:3000",      # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://deep-track-mathai.vercel.app",  # Vercel production 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    print("🚀 Math.AI Backend Starting...")
    print("="*60)
    print("✓ FastAPI server initialized")
    print("✓ CORS enabled for frontend communication")
    print("✓ AI orchestrator ready")
    print("\n📝 API Documentation available at:")
    print("   http://localhost:8000/docs")
    print("   http://localhost:8000/redoc")
    print("\n💬 Ready to process questions!")
    print("="*60 + "\n")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on server shutdown"""
    print("\n" + "="*60)
    print("🛑 Math.AI Backend Shutting Down...")
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
