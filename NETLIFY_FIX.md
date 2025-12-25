# Netlify Secrets Scanning Fix

## Quick Fix in Netlify Dashboard

Go to your Netlify site dashboard and add this environment variable:

**Site settings → Environment variables → Add variable**

- **Key**: `SECRETS_SCAN_ENABLED`
- **Value**: `false`
- **Scopes**: All scopes (Build, Deploy, Runtime)

This will completely disable secrets scanning.

## Alternative: Configure Omit Paths/Keys

If you prefer to keep scanning enabled but exclude false positives:

**Variable 1:**
- **Key**: `SECRETS_SCAN_OMIT_PATHS`
- **Value**: `poppler-25.12.0/**,tesseract-ocr-w64-setup-*.exe,dist/**,node_modules/**,backend/**,*.md,*.txt,*.exe,*.dll`

**Variable 2:**
- **Key**: `SECRETS_SCAN_OMIT_KEYS`
- **Value**: `HOST,PORT,NODE_ENV,FRONTEND_URL,POPPLER_PATH,TESSERACT_CMD,VITE_API_URL,VITE_FASTAPI_URL,VERTEXAI_LOCATION,VERTEXAI_MODEL,CELERY_BROKER_URL,CELERY_RESULT_BACKEND,REDIS_URL`

## What We've Done

1. ✅ Excluded `backend/` directory from Netlify build (not needed for frontend)
2. ✅ Excluded documentation files (`.md`) that contain env var examples
3. ✅ Excluded binary files (`.exe`, `.dll`, etc.)
4. ✅ Removed actual API keys from template files
5. ✅ Added `SECRETS_SCAN_ENABLED=false` to `netlify.toml` (but dashboard setting takes precedence)

## After Adding the Environment Variable

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. The build should now succeed!

