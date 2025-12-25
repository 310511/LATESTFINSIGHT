# Netlify Secrets Scanning Configuration
# Add these environment variables in Netlify Dashboard > Site settings > Environment variables
# to exclude them from secrets scanning

SECRETS_SCAN_OMIT_PATHS=poppler-25.12.0/**,tesseract-ocr-w64-setup-*.exe,dist/**,node_modules/**,backend/venv/**,venv/**,*.dll,*.exe,*.dylib,*.so

SECRETS_SCAN_OMIT_KEYS=HOST,PORT,NODE_ENV,FRONTEND_URL,POPPLER_PATH,TESSERACT_CMD,VITE_API_URL,VITE_FASTAPI_URL,VERTEXAI_LOCATION,VERTEXAI_MODEL,CELERY_BROKER_URL,CELERY_RESULT_BACKEND,REDIS_URL
