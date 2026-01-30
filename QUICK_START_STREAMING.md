# ⚡ Quick Start - AI Response Streaming

## 🎯 TL;DR - Get Streaming Working in 2 Minutes

### Terminal 1: Start Backend
```bash
cd c:\Users\Administrator\Documents\Math.ai\AI_logic
../venv/Scripts/uvicorn src.api.server:app --reload --port 8000
```

### Terminal 2: Start Frontend
```bash
cd c:\Users\Administrator\Documents\Math.ai
npm run dev
```

### Browser
Open: **http://192.168.0.101:5175/**

Submit question → Watch text stream in real-time! ⚡

---

## ✅ What's Already Done

| Component | Status | Port |
|-----------|--------|------|
| FastAPI Backend | ✅ Ready | 8000 |
| React Frontend | ✅ Ready | 5175 |
| Claude Streaming | ✅ Ready | API |
| CORS Config | ✅ Ready | All |
| Deployment | ✅ Ready | Render |

---

## 🧪 Quick Tests

### Test 1: Is backend running?
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok",...}`

### Test 2: Does streaming work?
```bash
curl -N -X POST http://localhost:8000/ask-stream \
  -H "Content-Type: application/json" \
  -d '{"text":"What is 2+2?","user_id":"test"}'
```
Expected: NDJSON chunks streaming

### Test 3: Full end-to-end
1. Open browser to http://192.168.0.101:5175/
2. Ask: "Résoudre x² = 4"
3. Watch response stream! ✨

---

## 🐛 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS Error | Restart backend (5175 in whitelist ✅) |
| Empty Response | Check `.env` keys, run `python AI_logic/src/init_db.py` |
| 500 Error | Check backend logs: `tail -f AI_logic/logs/chat_history.jsonl` |
| Not streaming | Clear browser cache, restart servers |

---

## 📁 Important Files

- **Backend streaming:** `AI_logic/src/api/server.py` (line 200+)
- **Orchestrator streaming:** `AI_logic/src/engine/orchestrator.py` (line 271+)
- **Frontend handler:** `src/services/api.ts` (line 14+)
- **Chat component:** `src/features/chat/ChatMessage.tsx` (line 84+)
- **Environment vars:** `AI_logic/.env` ✅ Already set

---

## 🚀 Production Deploy

```bash
# Push to GitHub
git add -A && git commit -m "Streaming ready" && git push origin main

# Then in Render dashboard:
# Click "Manual Deploy"
```

Test at: **https://math-ai-1-b5es.onrender.com**

---

## 📊 Expected Performance

- **Time to first token:** < 1 second ⚡
- **Streaming speed:** 50-100 tokens/sec
- **Total response:** 10-15 seconds
- **User experience:** Lightning fast! 🔥

---

## 📚 Full Documentation

- **Detailed guide:** See `STREAMING_TEST_GUIDE.md`
- **Architecture:** See `STREAMING_IMPLEMENTATION_SUMMARY.md`

---

**Everything is ready. Start the servers and test now!** 🎉
