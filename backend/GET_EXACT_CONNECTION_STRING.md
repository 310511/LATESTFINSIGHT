# Get the EXACT Connection String from Supabase

## The Problem
"Tenant or user not found" error means the connection string format is incorrect. You need to get the **EXACT** connection string from Supabase Dashboard, not construct it manually.

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard/project/igqocjymgmhygdyvviii
- Or: https://supabase.com/dashboard → Select your project

### 2. Navigate to Database Settings
- Click **Settings** (gear icon) in the left sidebar
- Click **Database** in the settings menu

### 3. Get Connection String
- Scroll down to **Connection string** section
- You'll see multiple tabs:
  - **URI** - Direct connection
  - **Connection pooling** - Transaction pooler
  - **Session mode** - Session pooler

### 4. Copy the Connection String
**Try in this order:**

#### Option 1: URI Tab (Direct Connection)
1. Click on **URI** tab
2. You'll see a connection string like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.igqocjymgmhygdyvviii.supabase.co:5432/postgres
   ```
3. **Copy this entire string**
4. Replace `[YOUR-PASSWORD]` with your actual password
5. Add to `.env`:
   ```env
   SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.igqocjymgmhygdyvviii.supabase.co:5432/postgres
   ```

#### Option 2: Connection Pooling Tab
1. Click on **Connection pooling** tab
2. Copy the connection string shown
3. Replace `[YOUR-PASSWORD]` with your actual password
4. Add to `.env`

#### Option 3: Session Mode Tab
1. Click on **Session mode** tab
2. Copy the connection string shown
3. Replace `[YOUR-PASSWORD]` with your actual password
4. Add to `.env`

### 5. Verify Your Password
- In the same Database settings page
- Scroll to **Database password** section
- If you see "Reset database password", you might need to reset it
- Make sure you're using the **exact** password shown (no extra spaces)

### 6. Check Your Project Status
- Make sure your Supabase project is **active** (not paused)
- Check the project status in the dashboard

## Common Issues

### Issue: "Tenant or user not found"
**Possible causes:**
1. Wrong username format
   - Should be: `postgres` (for direct) or `postgres.PROJECT_REF` (for pooling)
2. Wrong password
   - Make sure no extra spaces or quotes
3. Wrong project reference
   - Verify it's `igqocjymgmhygdyvviii`

### Issue: "getaddrinfo ENOTFOUND"
**Cause:** Wrong hostname
**Fix:** Use the exact hostname from Supabase Dashboard

### Issue: Password has special characters
**Fix:** The password will be automatically URL-encoded, but make sure you're using the exact password from Supabase

## After Updating .env

1. **Save the .env file**
2. **Run the test script:**
   ```bash
   cd LATESTFINSIGHT/backend
   node test-db-connection.js
   ```
3. **If test passes, restart server:**
   ```bash
   npm start
   ```

## Still Not Working?

1. **Reset your database password:**
   - Supabase Dashboard → Settings → Database
   - Click "Reset database password"
   - Use the new password in your connection string

2. **Check if project is paused:**
   - Supabase Dashboard → Project Settings
   - Make sure project is active

3. **Try different connection types:**
   - Try URI (direct) first
   - Then try Connection pooling
   - Then try Session mode

4. **Contact Supabase Support:**
   - If nothing works, there might be an issue with your Supabase project
   - Check Supabase status page: https://status.supabase.com

