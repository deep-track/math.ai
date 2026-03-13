# Math.AI - Intelligent Math Tutor

An AI-powered math tutoring application, combining streaming responses with academic formatting. Real-time text generation creates an engaging learning experience with professional pedagogy.

**[Live Demo](https://deep-track-mathai.vercel.app)** | **[API Docs](https://math-ai-1-b5es.onrender.com/docs)**

---

##  Features

-  **Real-time Streaming** - Text appears character-by-character as it's generated
-  **Academic Formatting** - Structured solutions with steps, equations, and conclusions
-  **Localized Content** - Tailored curriculum for Benin's education system
-  **Vector Search** - Fast retrieval using Cohere embeddings and ChromaDB
-  **User Authentication** - Auth0 integration for secure access
-  **Analytics** - Track learning sessions and response metrics
-  **Production-Ready** - Deployed on Render (backend) & Vercel (frontend)

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                    │
│                  https://vercel-domain.app                  │
│  • Streaming UI with KaTeX math rendering                  │
│  • Auth0 authentication                                     │
│  • Real-time response display                              │
└─────────────────────────────────────────────────────────────┘
                           ↓↑ HTTPS
                  Real-time Streaming (SSE)
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                         │
│               https://math-ai-1-b5es.onrender.com           │
│  • /ask-stream - Streaming responses with anti-buffering   │
│  • /ask - Non-streaming responses                          │
│  • /health - Health check endpoint                         │
└─────────────────────────────────────────────────────────────┘
                  ↓ (Retrieval + Generation)
┌──────────────────────────┬──────────────────┬──────────────┐
│    ChromaDB (Vector DB)  │  Claude API      │  Cohere API  │
│    Persistent storage    │  Text generation │  Embeddings  │
│    Curriculum data       │  Streaming       │  Vector index│
└──────────────────────────┴──────────────────┴──────────────┘
```

---

##  Quick Start

### Prerequisites

- Node.js 18+ (frontend)
- Python 3.11.9 (backend)
- API Keys: `ANTHROPIC_API_KEY`, `COHERE_API_KEY`, `MISTRAL_API_KEY`
- Auth0 app + API configuration for protected admin endpoints

### Clone & Setup

```bash
# Clone repository
git clone https://github.com/deep-track/math.ai.git
cd math.ai

# Backend setup
cd AI_logic
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
python src/init_db.py

# Frontend setup (new terminal, from repo root)
npm install
```

### Environment Variables

Create `.env` in `AI_logic/`:

```env
# API Keys
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...
MISTRAL_API_KEY=...

# Auth0 backend verification
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier

# Access control
ADMIN_EMAILS=admin@example.com
WHITELIST_EMAILS=

# Configuration
VERBOSE=True
PYTHONUNBUFFERED=1
CHROMA_SERVER_NOINTERACTIVE=TRUE
ANONYMIZED_TELEMETRY=False

# Optional: MongoDB for server-side persistence (credits & conversations)
# When provided the server will migrate existing JSON files into MongoDB collections on startup.
MONGODB_URI=mongodb://user:pass@host:27017
MONGODB_DB=mathai

# Optional: restrict CORS to your deployed frontend URLs
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://yourdomain.com

# Optional: cost alert emails
ALERT_EMAIL=alerts@example.com
DAILY_COST_THRESHOLD=5.00
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=your-app-password
```

Create `.env.local` in repo root (frontend):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-api-identifier
```

Note: When `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are set, protected backend endpoints require a valid Auth0 access token via `Authorization: Bearer <token>`. Admin endpoints also require the caller email to be listed in `ADMIN_EMAILS`.

### Deployment Environment Variables

**Render backend**

- `MONGODB_URI`
- `ANTHROPIC_API_KEY`
- `COHERE_API_KEY`
- `MISTRAL_API_KEY`
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `ADMIN_EMAILS`
- `WHITELIST_EMAILS` (optional)
- `ALLOWED_ORIGINS`
- `ALERT_EMAIL` / `DAILY_COST_THRESHOLD` / `SMTP_*` (optional)

**Vercel frontend**

- `VITE_API_BASE_URL`
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`
- `VITE_ENABLE_KATEX`
- `VITE_ENABLE_ANALYTICS`
- `VITE_ENABLE_TUTOR_MODE`

### Run Locally

**Terminal 1 - Backend:**

```bash
cd AI_logic
../venv/Scripts/uvicorn src.api.server:app --reload --port 8000
```

Visit: http://localhost:8000/docs (API documentation)

**Terminal 2 - Frontend:**

```bash
npm run dev
```

Visit: http://localhost:5173 (or shown in terminal output)

---

## Project Structure

```
math.ai/
├── AI_logic/                          # Backend (Python/FastAPI)
│   ├── src/
│   │   ├── api/
│   │   │   └── server.py             # FastAPI server, streaming endpoint
│   │   ├── engine/
│   │   │   └── orchestrator.py       # AI orchestration, streaming logic
│   │   ├── retrieval/
│   │   │   ├── ingest_curriculum.py  # ChromaDB ingestion
│   │   │   └── extract.py            # Vector search
│   │   └── utils/
│   │       ├── logger.py             # Logging utilities
│   │       └── response_parser.py    # Response formatting
│   ├── curriculum_data/              # Benin curriculum documents
│   ├── chroma_db/                    # Vector database (persistent)
│   ├── evals/                        # Evaluation scripts and test questions
│   ├── logs/                         # Chat history (JSONL)
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Environment variables
│
├── src/                              # Frontend (React/TypeScript)
│   ├── components/
│   │   ├── SolutionDisplay.tsx      # Response rendering
│   │   ├── ChatMessage.tsx          # Chat interface
│   │   ├── LoadingState.tsx         # Loading indicator
│   │   ├── ErrorDisplay.tsx         # Error handling
│   │   └── MarkdownDisplay.tsx      # Math formula rendering
│   ├── features/
│   │   ├── auth/                    # Auth0 authentication
│   │   ├── chat/                    # Chat UI components
│   │   └── sidebar/                 # Navigation sidebar
│   ├── services/
│   │   ├── api.ts                   # Streaming handler (solveProblemStream)
│   │   └── mathAiApi.ts             # API client
│   ├── types/
│   │   ├── AcademicResponse.ts      # Type definitions
│   │   └── index.ts                 # Shared types
│   └── utils/
│       ├── mathRender.tsx           # KaTeX math rendering
│       └── translations.ts          # i18n support
│
├── public/                           # Static assets
├── package.json                      # Node dependencies
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                   # Vite build config
├── render.yaml                      # Render deployment config
├── vercel.json                      # Vercel deployment config
└── README.md                        # This file
```

---

## 🔌 API Endpoints

### `/ask-stream` - Streaming Response

**Request:**
```bash
POST /ask-stream
Content-Type: application/json

{
  "text": "Résoudre x² = 4",
  "user_id": "user-123",
  "context": "",
  "session_id": ""
}
```

**Response (Server-Sent Events):**
```
: connected

data: {"type":"start","partie":"Mathématiques","problemStatement":"...","sources":[...]}
data: {"type":"chunk","text":"Pour résoudre"}
data: {"type":"chunk","text":" cette équation"}
...
data: {"type":"end","conclusion":"...","sources":[...]}
```

### `/ask` - Non-Streaming Response

**Request:**
```bash
POST /ask
Content-Type: application/json

{"text": "Your question"}
```

**Response:**
```json
{
  "partie": "Mathématiques",
  "problemStatement": "...",
  "steps": [
    {
      "title": "...",
      "explanation": "...",
      "equations": ["..."]
    }
  ],
  "conclusion": "...",
  "sources": [...]
}
```

### `/health` - Health Check

```bash
GET /health
```

```json
{
  "status": "ok",
  "service": "Math.AI Backend",
  "timestamp": "2026-01-31T..."
}
```

---

##  AI Integration

### Models Used

| Model | Purpose | Provider |
|-------|---------|----------|
| Claude Sonnet 4.5 | Primary text generation | Anthropic |
| Cohere Multilingual v3 | Vector embeddings | Cohere |

### Retrieval Pipeline

1. **User Question** → Cohere embeddings
2. **Vector Search** → ChromaDB (3 top results)
3. **Context Building** → Curriculum docs + fallback
4. **Prompt Construction** → Bilingual (French/English with math notation)
5. **Stream Generation** → Claude via streaming API
6. **Response Parsing** → Academic format with step extraction

---

## Testing

### Run Backend Tests

```bash
cd AI_logic


# Evaluate on curriculum questions
python evals/run_curriculum_test.py
```

### Manual Testing

```bash
# Test streaming endpoint
curl -N -X POST http://localhost:8000/ask-stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"Quelle est la dérivée de x²?","user_id":"test"}'

# Check API docs
curl http://localhost:8000/docs

# Health check
curl http://localhost:8000/health
```

---

##  Deployment

### Render (Backend)

1. Connect GitHub repo to [Render](https://render.com)
2. Create Web Service with:
   - **Root Directory:** `AI_logic`
   - **Build Command:** `pip install -r requirements.txt && python src/init_db.py`
   - **Start Command:** `uvicorn src.api.server:app --host 0.0.0.0 --port $PORT --timeout-keep-alive 300 --timeout-graceful-shutdown 300`
3. Add environment variables (ANTHROPIC_API_KEY, COHERE_API_KEY, MISTRAL_API_KEY)
4. Deploy

Live: https://math-ai-1-b5es.onrender.com

### Vercel (Frontend)

1. Connect GitHub repo to [Vercel](https://vercel.com)
2. Configure:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variable:
   - `VITE_API_BASE_URL` = `https://math-ai-1-b5es.onrender.com`
4. Deploy

Live: https://deep-track-mathai.vercel.app

---

## Streaming Optimization

### Anti-Buffering Headers

The backend sends these headers to prevent proxy buffering:

```python
headers={
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",  # Render Nginx
    "Transfer-Encoding": "chunked",
    "Content-Type": "text/event-stream; charset=utf-8"
}
```

### Frontend Streaming Handler

The `solveProblemStream()` function in `src/services/api.ts`:

1. **Connects** with SSE headers
2. **Parses** NDJSON stream (newline-delimited JSON)
3. **Accumulates** text chunks
4. **Yields** solutions progressively for UI updates
5. **Handles** keepalive pings and errors

```typescript
for await (const solution of solveProblemStream(problem)) {
  // Update UI with streaming content
  setSolution(solution);
}
```

---

##  Authentication

Uses **Clerk** for user authentication and session management.

**Setup:**

1. Create Clerk account at https://clerk.com
2. Get API keys from dashboard
3. Set in frontend environment:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   ```

**Features:**

- Sign-up / Sign-in / Sign-out
- OAuth (Google, GitHub, etc.)
- User profile management
- Session persistence

---

## Analytics

Tracked events:

- `problem_submitted` - User submits a question
- `solution_received` - Solution generated successfully
- `error_occurred` - Request failed
- `response_time` - Generation time in milliseconds

Stored in `AI_logic/logs/chat_history.jsonl` (JSONL format)

---

## Troubleshooting

### "Stream receiving 0 chunks"

**Check:**
1. Backend logs for errors: `tail -f AI_logic/logs/chat_history.jsonl`
2. API keys valid in `.env`
3. ChromaDB initialized: `python AI_logic/src/init_db.py`
4. Browser DevTools Network tab shows response headers include `X-Accel-Buffering: no`

**Fix:**
1. Restart backend
2. Clear browser cache (Ctrl+Shift+Del)
3. Hard refresh (Ctrl+F5)

### "CORS Error"

**Check:**
- Backend CORS middleware includes your frontend origin
- Response headers include `Access-Control-Allow-Origin`

**Fix in `server.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.vercel.app", ...],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

### "API Key Invalid"

**Check:**
- `.env` file exists in `AI_logic/`
- Keys are not expired or revoked
- Keys match provider (Anthropic, Cohere, Mistral)

**Verify:**
```bash
cd AI_logic
grep -E "ANTHROPIC|COHERE" .env
```

### "ChromaDB Errors"

**Reset database:**
```bash
cd AI_logic
rm -rf chroma_db/
python src/init_db.py
```

---

## Documentation

- **Streaming Guide:** See `STREAMING_IMPLEMENTATION_SUMMARY.md`
- **Production Fixes:** See `PRODUCTION_STREAMING_FIXES.md`
- **Test Guide:** See `STREAMING_TEST_GUIDE.md`
- **API Reference:** http://localhost:8000/docs (when running locally)

---

##  Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 👨‍💻 Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **KaTeX** - Math formula rendering
- **React Markdown** - Markdown display
- **Clerk** - Authentication

### Backend
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **ChromaDB** - Vector database
- **Anthropic SDK** - Claude API
- **Cohere SDK** - Embeddings
- **Pydantic** - Data validation

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review documentation files in repo
3. Check logs: `tail -f AI_logic/logs/chat_history.jsonl`
4. Open an issue on GitHub

---

##  Roadmap

- [ ] Multi-language support (English, French)
- [ ] Offline mode with cached responses
- [ ] Student progress tracking and analytics dashboard
- [ ] Collaborative problem-solving sessions
- [ ] Mobile app (React Native)
- [ ] Advanced math visualization tools

---

**Last Updated:** January 31, 2026  
**Status:**  Production Ready  
**Version:** 1.0.0
