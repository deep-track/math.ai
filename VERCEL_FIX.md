# Vercel Deployment Fix - Math.AI

## What Was Wrong
The frontend wasn't being deployed correctly because:
1. No `vercel.json` configuration file
2. Missing SPA routing fallback to `index.html`
3. Environment variables not configured

## What Was Fixed
✅ Created `vercel.json` with proper Vite configuration  
✅ Added SPA rewrites to handle client-side routing  
✅ Updated `vite.config.ts` with production build settings  
✅ Created `.env.production` for production environment variables  
✅ Added `.vercelignore` to exclude unnecessary files  

## Deploy to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Fix Vercel deployment configuration"
git push origin main
```

### Step 2: Configure Environment Variables in Vercel

Go to: https://vercel.com/dashboard/deep-track-mathai/settings/environment-variables

Add these environment variables:

**For Frontend:**
```
VITE_API_BASE_URL=https://your-backend-api.com
```

**For Backend (if deploying separately):**
```
MISTRAL_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
COHERE_API_KEY=your_key
```

### Step 3: Redeploy

Option A - Automatic (recommended):
- Push changes to `main` branch
- Vercel will automatically redeploy

Option B - Manual:
```bash
vercel --prod
```

### Step 4: Verify

Visit: https://deep-track-mathai.vercel.app/

You should now see the Math.AI interface instead of 404.

---

## Important Notes

⚠️ **Backend API Configuration**
- The frontend needs a backend API running somewhere
- Either deploy `AI_logic/src/api/server.py` to a service like:
  - Railway.app
  - Render.com
  - AWS Lambda
  - Google Cloud Run
  - Or keep it running locally for now

- Update `VITE_API_BASE_URL` environment variable to point to your backend

⚠️ **CORS Configuration**
- Make sure your backend FastAPI server has CORS enabled for:
  - `https://deep-track-mathai.vercel.app`
  - `https://*.vercel.app`

Example in `server.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://deep-track-mathai.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Troubleshooting

### Still Getting 404?
1. Check Vercel build logs: https://vercel.com/dashboard
2. Verify `dist` folder was created: Should contain `index.html`
3. Check that `npm run build` succeeds locally:
   ```bash
   npm run build
   npm run preview  # Preview the production build locally
   ```

### API Calls Failing?
1. Check browser console (F12) → Network tab
2. Look for CORS errors
3. Verify `VITE_API_BASE_URL` is set correctly in Vercel
4. Test API directly:
   ```bash
   curl https://your-backend-api.com/health
   ```

### Build Fails?
1. Check Vercel build logs for specific errors
2. Run locally to verify:
   ```bash
   npm run build
   ```
3. Fix any TypeScript errors shown

---

## Next Steps

1. **Deploy Backend** - Choose a service to host `AI_logic/src/api/server.py`
2. **Update API URL** - Set `VITE_API_BASE_URL` to your backend URL in Vercel settings
3. **Test End-to-End** - Try asking a math question on the deployed site

Happy deploying! 🚀
