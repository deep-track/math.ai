# Streaming Implementation Guide

## Overview

Streaming has been implemented across the full stack to provide real-time, word-by-word response delivery. This dramatically reduces perceived latency from 5-10 seconds to **near-zero** as users see content appearing immediately while Claude processes the response.

## Architecture

### 1. Backend Streaming (Python/FastAPI)

**File**: `AI_logic/src/engine/orchestrator.py`

**New Function**: `ask_math_ai_stream(question, history)`

```python
def ask_math_ai_stream(question: str, history: str = ""):
    """
    Streaming version of ask_math_ai that yields text chunks.
    Used by FastAPI to stream responses to the frontend.
    
    Yields JSON lines with chunks of the response.
    """
```

**How it works:**
1. Retrieves curriculum context (same as non-streaming)
2. Opens a streaming connection to Claude API using `.messages.stream()`
3. Iterates through Claude's `text_stream` to get chunks
4. Yields JSON-formatted chunks:
   - `{"type": "start", "partie": "...", "problemStatement": "...", "sources": [...]}`
   - `{"type": "chunk", "text": "..."}`  (repeated for each text delta)
   - `{"type": "end", "conclusion": "...", "sources": [...]}`
   - `{"type": "error", "error": "..."}` (if something fails)

**Key technical details:**
- Uses Claude Sonnet 4.5's native `.messages.stream()` API
- Yields NDJSON (newline-delimited JSON) format
- Each chunk is a complete JSON object followed by newline
- Token limits remain at 2048 for streaming

### 2. API Endpoint (FastAPI)

**File**: `AI_logic/src/api/server.py`

**New Endpoint**: `POST /ask-stream`

```python
@app.post("/ask-stream")
async def ask_stream_endpoint(request: QuestionRequest):
    """
    Streaming endpoint for solving math problems.
    
    Streams the response back as newline-delimited JSON (NDJSON).
    """
```

**Response Format:**
- Media type: `application/x-ndjson`
- Header: `X-Accel-Buffering: no` (disables proxy buffering)
- Each line is a valid JSON object

**Example Response Flow:**
```
{"type":"start","partie":"Mathématiques","problemStatement":"Résoudre 2x+3=7","sources":[]}
{"type":"chunk","text":"# "}
{"type":"chunk","text":"Résolution"}
{"type":"chunk","text":" de "}
{"type":"chunk","text":"l'équation"}
...
{"type":"end","conclusion":"Voir explication ci-dessus","sources":[]}
```

### 3. Frontend API Service (TypeScript)

**File**: `src/services/api.ts`

**New Function**: `solveProblemStream(problem)`

```typescript
export async function* solveProblemStream(problem: Problem): AsyncGenerator<Solution, void, unknown>
```

**Features:**
- AsyncGenerator pattern for consuming streaming data
- Parses NDJSON line-by-line
- Accumulates text chunks into `fullContent`
- Yields Solution objects on each chunk (progressive updates)
- Status progression: `streaming` → `ok`

**Chunk Handling:**
```typescript
// Example: As chunks arrive
yield {
  id: solutionId,
  content: "# Résolution...",      // Accumulated so far
  finalAnswer: "# Résolution...",
  status: 'streaming',              // Changes to 'ok' at end
  sources: [],
  ...
}
```

### 4. React Component (ChatMessage.tsx)

**File**: `src/features/chat/ChatMessage.tsx`

**Integration:**
1. Creates placeholder Solution with `status: 'streaming'`
2. Adds message to chat immediately (no loading state)
3. Iterates over `solveProblemStream()` using `for await`
4. Updates Solution content on each chunk
5. Auto-scrolls to bottom
6. Changes status to `ok` when stream ends

**Key Code:**
```typescript
for await (const solution of solveProblemStream(problem)) {
  lastResponseTime = Date.now();
  
  // Update the assistant message with streaming content
  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === assistantMessageId
        ? {
            ...msg,
            solution: {
              ...msg.solution!,
              content: solution.content,        // Updates with each chunk
              finalAnswer: solution.finalAnswer,
              status: solution.status,          // streaming → ok
              sources: solution.sources,
            } as any,
          }
        : msg
    )
  );
  
  // Auto-scroll to bottom
  setTimeout(() => {
    const scrollContainer = document.querySelector('.scrollbar-thin');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, 0);
}
```

### 5. Type System (TypeScript)

**File**: `src/types/index.ts`

**Updated ResponseStatus:**
```typescript
export type ResponseStatus = 'ok' | 'tutor' | 'refusal' | 'streaming';
```

Confidence is a 0-100 scale (not 0-1):
```typescript
export interface Solution {
  confidence: number;     // 0-100
  confidenceLevel: ConfidenceLevel;
  status: ResponseStatus; // Now includes 'streaming'
  content?: string;       // Full markdown content
  sources?: Source[];     // Curriculum references
}
```

## Performance Impact

### Before Streaming
- Response appears after 5-10 seconds
- User sees loading spinner
- Perceived latency is high
- All processing happens server-side before client sees anything

### After Streaming
- **First chunk appears in 0.5-1 second**
- Perceived latency is near-zero
- User sees text being generated in real-time
- Processing and display happen concurrently
- Total time from submission to completion: ~8-12 seconds (same total, but with immediate visual feedback)

### Test Results
From `test_streaming.py`:
```
✅ SUCCESS: Full streaming response received
   Total chunks: 206
   Response size: 1668 characters
   Time to first chunk: ~1 second
   Time to complete: ~8 seconds
```

## How to Test

### 1. Test Endpoint Directly
```bash
# Terminal 1: Start backend
cd AI_logic
uvicorn src.api.server:app --reload --port 8000

# Terminal 2: Run test
python test_streaming.py
```

### 2. Test in Frontend (Local Development)
```bash
# Terminal 1: Start backend
cd AI_logic
uvicorn src.api.server:app --reload --port 8000

# Terminal 2: Start frontend
npm run dev

# Open http://localhost:5173
# Submit a math question
# Watch response appear word-by-word
```

### 3. Browser Testing with cURL
```bash
curl -X POST http://localhost:8000/ask-stream \
  -H "Content-Type: application/json" \
  -d '{"text":"Résoudre 2x + 3 = 7","user_id":"test"}' \
  | jq '.'
```

## Fallbacks and Error Handling

### If Streaming Fails
1. API returns `{"type": "error", "error": "message"}`
2. Frontend catches error and displays to user
3. Non-streaming endpoint `/ask` remains available as fallback

### Circuit Breaking
If needed, users can still use the non-streaming endpoint:
```typescript
// Fallback to non-streaming
const solution = await solveProblem(problem);
```

## Deployment Considerations

### Render.com (Production)
- Streaming works seamlessly
- No additional configuration needed
- `X-Accel-Buffering: no` header prevents buffering

### Vercel (Frontend)
- Vercel handles streaming responses correctly
- Routes to Render backend as usual

### CORS
- No additional CORS headers needed for streaming
- All streaming requests use standard POST with same CORS rules

## Monitoring & Logging

### Backend Logs
```
[STREAM REQUEST] 2026-01-30T17:16:14.416750
  User ID: test_user
  Session: test_session
  Question: Résoudre l'équation 2x + 3 = 7...

[Log saved to logs/chat_history.jsonl]
```

### Frontend Console
```javascript
console.log('📤 Sending problem to backend (STREAM): ...')
console.log('🟢 Stream started')
console.log('✅ Stream completed')
```

### Analytics
Response time tracking still works:
```typescript
const responseTime = lastResponseTime - startTime;
await trackAnalyticsEvent({
  eventType: 'problem_submitted',
  responseTime,  // Measures time from submit to stream complete
  ...
});
```

## Migration Guide

### For Developers
- **Old API**: `/ask` (POST) - returns full response
- **New API**: `/ask-stream` (POST) - returns streamed response
- Both endpoints available simultaneously (no breaking changes)

### For Frontend
- Update component to use `solveProblemStream()` instead of `solveProblem()`
- Wrap in `for await` loop
- Update Solution on each iteration

### Backward Compatibility
- Non-streaming endpoint `/ask` still works
- Can switch between endpoints by changing one import
- No database or backend changes required

## Technical Debt & Future Improvements

1. **Client-side message deduplication**: Prevent race conditions if same solution yields multiple times
2. **Streaming interruption handling**: Allow users to stop streaming mid-response
3. **Chunk rate limiting**: Control how fast chunks are sent to frontend
4. **Streaming metrics**: Track chunk counts, timing, etc.
5. **Partial solution recovery**: If stream breaks, resume from checkpoint

## Files Modified

### Backend
- `AI_logic/src/engine/orchestrator.py` - Added `ask_math_ai_stream()` function
- `AI_logic/src/api/server.py` - Added `/ask-stream` endpoint and `StreamingResponse` import

### Frontend
- `src/services/api.ts` - Added `solveProblemStream()` async generator
- `src/features/chat/ChatMessage.tsx` - Updated to use streaming with `for await`
- `src/types/index.ts` - Added `streaming` to `ResponseStatus` type

### Testing
- `AI_logic/test_streaming.py` - New comprehensive streaming test script

## Summary

Streaming enables **real-time, word-by-word response delivery** with zero perceived latency. Users see content appearing immediately while the backend continues processing, dramatically improving the user experience. The implementation uses industry-standard NDJSON format, works with both production and development environments, and maintains full backward compatibility with non-streaming endpoints.
