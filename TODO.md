# Deployment Fix TODO

## Issues Identified
- Frontend API calls missing "/api" prefix (backend uses router with prefix="/api")
- API_BASE_URL needs to point to deployed backend URL instead of localhost

## Changes Made
- ✅ Updated all API calls in `src/services/api.ts` to include "/api" prefix
- ✅ Fixed ask-stream, ask, conversations, and credits endpoints

## Remaining Tasks
- Set VITE_API_BASE_URL environment variable in Vercel to point to Render backend URL
- Example: `https://math-ai-backend-xyz.onrender.com` (replace with actual Render URL)
- Test the deployment after setting the environment variable

## Testing
- Deploy frontend to Vercel with correct VITE_API_BASE_URL
- Verify all endpoints (ask-stream, conversations, credits) work on deployed version
