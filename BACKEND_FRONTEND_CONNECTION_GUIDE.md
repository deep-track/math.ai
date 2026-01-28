# Backend-Frontend Connection Guide

This guide walks you through connecting your AI logic backend (Python/FastAPI) to your React frontend.

---

## 📋 Overview

Your architecture will look like this:

```
React Frontend (Port 5173)
         ↓
    HTTP Requests
         ↓
FastAPI Backend (Port 8000)
         ↓
   AI Logic (orchestrator.py)
         ↓
AI Providers (Anthropic, Cohere, Mistral)
```

---

## Step 1: Create the FastAPI Server File

**Location:** `AI_logic/src/api/server.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# 1. Add your project root to the path so we can import the engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 2. Import your AI function
from src.engine.orchestrator import ask_math_ai

app = FastAPI(title="Math.AI Backend")

# 3. CORS Configuration - Allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Define the data format (What the frontend sends us)
class QuestionRequest(BaseModel):
    text: str
    user_id: str = "guest"
    context: str = ""  # Optional context for better answers

# 5. Create the Endpoint (The door the frontend knocks on)
@app.post("/ask")
async def ask_endpoint(request: QuestionRequest):
    """
    Main endpoint for solving math problems
    Frontend sends a question, backend returns the solution
    """
    try:
        print(f"[REQUEST] User: {request.user_id} | Question: {request.text}")
        
        # Call your AI Agent
        response = ask_math_ai(request.text)
        
        print(f"[RESPONSE] Answer generated successfully")
        
        # Return the answer
        return {
            "success": True,
            "answer": response,
            "user_id": request.user_id
        }
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 6. Health check endpoint
@app.get("/health")
async def health_check():
    """Check if the backend is running"""
    return {"status": "ok", "service": "Math.AI Backend"}

# 7. Run instructions
# Run this file in your terminal:
# cd AI_logic
# uvicorn src.api.server:app --reload --port 8000
```

---

## Step 2: Update requirements.txt

Add FastAPI and uvicorn to your `AI_logic/requirements.txt`:

```
# ... existing packages ...

# --- Backend API (FastAPI) ---
fastapi==0.110.0
uvicorn==0.29.0
```

Then install:
```bash
cd AI_logic
pip install -r requirements.txt
```

---

## Step 3: Create the Frontend API Client

**Location:** `src/services/mathAiApi.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface MathQuestion {
  text: string;
  userId?: string;
  context?: string;
}

export interface MathResponse {
  success: boolean;
  answer: string;
  userId?: string;
}

/**
 * Send a math question to the backend and get the answer
 */
export async function askMathAI(question: MathQuestion): Promise<string> {
  try {
    console.log('📤 Sending question to backend:', question.text);
    
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: question.text,
        user_id: question.userId || 'guest',
        context: question.context || '',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    const data: MathResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Backend returned an error');
    }

    console.log('📥 Received answer from backend');
    return data.answer;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get answer from AI';
    console.error('❌ API Error:', message);
    throw new Error(message);
  }
}

/**
 * Check if the backend is running
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## Step 4: Update Frontend Environment Variables

**File:** `.env.local`

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# ... other variables ...
```

---

## Step 5: Use the API in Your React Component

**Example:** `src/components/ChatWindow.tsx`

```typescript
import { askMathAI, checkBackendHealth } from '../services/mathAiApi';

export function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(false);

  // Check backend on mount
  useEffect(() => {
    checkBackendHealth().then(setBackendReady);
  }, []);

  // Handle sending a question
  const handleSendQuestion = async (question: string) => {
    if (!backendReady) {
      alert('⚠️ Backend is not running. Please start the AI server.');
      return;
    }

    setLoading(true);
    try {
      const answer = await askMathAI({ 
        text: question,
        userId: currentUser?.id 
      });
      
      setMessages(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: answer }
      ]);
    } catch (error) {
      console.error('Failed to get answer:', error);
      setMessages(prev => [
        ...prev,
        { 
          role: 'error', 
          content: 'Failed to process your question. Please try again.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-window">
      {!backendReady && (
        <div className="warning">⚠️ Backend not connected</div>
      )}
      {/* Your chat UI here */}
    </div>
  );
}
```

---

## Step 6: Run Everything

### Terminal 1: Start the Backend

```bash
cd AI_logic
uvicorn src.api.server:app --reload --port 8000
```

You should see:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2: Start the Frontend

```bash
npm run dev
```

You should see:
```
VITE v7.2.4  ready in 123 ms

➜  local:   http://localhost:5173/
```

---

## Step 7: Test the Connection

1. **Test Backend Directly** (in your browser or with curl):
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"text": "What is 2+2?", "user_id": "test"}'
```

Expected response:
```json
{
  "success": true,
  "answer": "The answer is 4.",
  "user_id": "test"
}
```

2. **Test Frontend**: Open `http://localhost:5173` and try asking a question. Check the browser console for logs.

---

## ✅ Checklist

- [ ] Created `AI_logic/src/api/server.py` with FastAPI app
- [ ] Updated `AI_logic/requirements.txt` with fastapi and uvicorn
- [ ] Created `src/services/mathAiApi.ts` with API client
- [ ] Updated `.env.local` with `VITE_API_BASE_URL`
- [ ] Integrated API calls into React components
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] CORS is configured properly
- [ ] Tested with curl or Postman
- [ ] Tested end-to-end in the browser

---

## 🐛 Troubleshooting

### Issue: CORS Error
**Solution:** Make sure your frontend URL is in the `allow_origins` list in `server.py`:
```python
allow_origins=["http://localhost:5173", "http://localhost:3000"]
```

### Issue: Backend connection refused
**Solution:** 
- Check if backend is running on port 8000
- Verify `VITE_API_BASE_URL` in `.env.local`
- Check firewall settings

### Issue: 404 Not Found
**Solution:** Make sure the endpoint path matches:
```
Frontend: http://localhost:8000/ask
Backend: @app.post("/ask")
```

### Issue: Python import errors
**Solution:**
- Make sure `sys.path.append()` in `server.py` points to the correct root
- Run from the project root: `cd AI_logic && uvicorn ...`

---

## 📚 Next Steps

1. **Add Authentication:** Use your Clerk tokens to identify users
2. **Add Logging:** Track all requests/responses
3. **Add Caching:** Cache frequent questions
4. **Add Rate Limiting:** Prevent abuse
5. **Deploy:** Move from localhost to production servers

