# Fix Database Connection - Step by Step

## Current Error
```
❌ Failed to connect to Supabase database: Tenant or user not found
```

This means the connection string format or credentials are incorrect.

## Solution

### Step 1: Get Your Database Password

1. Go to Supabase Dashboard:
   - https://supabase.com/dashboard/project/igqocjymgmhygdyvviii
   - Or: https://supabase.com/dashboard → Select your project

2. Navigate to Database Settings:
   - Click **Settings** (gear icon) → **Database**

3. Find Database Password:
   - Scroll to **Database password** section
   - If you see "Reset database password", click it and set a new password
   - **Copy the password** (you'll need it)

### Step 2: Get Connection String from Supabase

1. In the same Database settings page
2. Scroll to **Connection string** section
3. Click on **Connection pooling** tab
4. You'll see a connection string like:
   ```
   postgresql://postgres.igqocjymgmhygdyvviii:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
5. **Copy this entire string**
6. Replace `[YOUR-PASSWORD]` with the password from Step 1

### Step 3: Update Your .env File

Open `LATESTFINSIGHT/backend/.env` and update these lines:

```env
# Replace [YOUR-DATABASE-PASSWORD] with your actual password
SUPABASE_DB_URL=postgresql://postgres.igqocjymgmhygdyvviii:YOUR_ACTUAL_PASSWORD_HERE@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Also update this line
DATABASE_URL=postgresql://postgres.igqocjymgmhygdyvviii:YOUR_ACTUAL_PASSWORD_HERE@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Step 4: Alternative - Use Individual Components

If you prefer, you can use:

```env
SUPABASE_PROJECT_REF=igqocjymgmhygdyvviii
SUPABASE_DB_PASSWORD=your_actual_password_here
SUPABASE_DB_PORT=6543
SUPABASE_REGION=us-east-1
```

The code will automatically construct the connection string.

### Step 5: Restart Server

```bash
# Stop current server (Ctrl+C)
cd LATESTFINSIGHT/backend
npm start
```

## Expected Success Output

```
🔗 Using connection: postgresql://postgres.igqocjymgmhygdyvviii:****@aws-0-us-east-1.pooler.supabase.com:6543/postgres
✅ Connected to Supabase PostgreSQL database
✅ Supabase database connection successful
   Connected at: 2025-01-15 10:30:00
🚀 FinSight API server running on port 3000
```

## Common Issues

### Issue: "Tenant or user not found"
**Cause:** Wrong username format or password
**Fix:** 
- Username should be: `postgres.igqocjymgmhygdyvviii` (not just `postgres`)
- Verify password is correct (no extra spaces, quotes, or special characters that need encoding)

### Issue: "password authentication failed"
**Cause:** Wrong password
**Fix:** Reset password in Supabase Dashboard and update .env

### Issue: "getaddrinfo ENOTFOUND"
**Cause:** Wrong hostname format
**Fix:** Use the exact connection string from Supabase Dashboard

## Quick Test

After updating .env, test the connection:

```bash
# The server will automatically test on startup
npm start
```

If you see "✅ Supabase database connection successful", you're good to go!

