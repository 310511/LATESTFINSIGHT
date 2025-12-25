# Netlify Deployment Guide

## Quick Setup

1. **Connect Repository to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Netlify will auto-detect the build settings from `netlify.toml`

2. **Configure Environment Variables**
   - Go to Site settings → Environment variables
   - Add the following variables to disable false-positive secret scanning:

   ```
   SECRETS_SCAN_OMIT_PATHS=poppler-25.12.0/**,tesseract-ocr-w64-setup-*.exe,dist/**,node_modules/**,backend/venv/**,venv/**,*.dll,*.exe,*.dylib,*.so
   ```

   ```
   SECRETS_SCAN_OMIT_KEYS=HOST,PORT,NODE_ENV,FRONTEND_URL,POPPLER_PATH,TESSERACT_CMD,VITE_API_URL,VITE_FASTAPI_URL,VERTEXAI_LOCATION,VERTEXAI_MODEL,CELERY_BROKER_URL,CELERY_RESULT_BACKEND,REDIS_URL
   ```

3. **Add Your Actual Secrets** (if needed for build)
   - Add any required API keys as environment variables
   - These will be available during build time as `process.env.VARIABLE_NAME`

4. **Deploy**
   - Netlify will automatically deploy on every push to main branch
   - Or trigger a manual deploy from the Deploys tab

## Build Configuration

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18 (configured in netlify.toml)

## Notes

- The frontend is a Vite SPA, so all routes redirect to `index.html`
- Binary files (poppler, tesseract) are excluded from the build
- Environment variable names in documentation are excluded from secrets scanning
- Actual API keys have been removed from template files

## Troubleshooting

If secrets scanning still fails:
1. Check that `SECRETS_SCAN_OMIT_PATHS` and `SECRETS_SCAN_OMIT_KEYS` are set correctly
2. Ensure no actual API keys are committed to the repository
3. Verify `.env` files are in `.gitignore`

