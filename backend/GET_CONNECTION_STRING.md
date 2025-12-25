# How to Get Your Supabase Database Connection String

## Quick Steps

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/igqocjymgmhygdyvviii
   - Or: https://supabase.com/dashboard → Select your project

2. **Navigate to Database Settings:**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **Database** in the settings menu

3. **Get Connection String:**
   - Scroll down to **Connection string** section
   - You'll see two tabs: **Connection pooling** and **URI**
   
4. **Copy Connection Pooling String (Recommended):**
   - Click on **Connection pooling** tab
   - You'll see a connection string like:
     ```
     postgresql://postgres.igqocjymgmhygdyvviii:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```
   - **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual database password
   - Copy the entire string

5. **Add to `.env` file:**
   ```env
   SUPABASE_DB_URL=postgresql://postgres.igqocjymgmhygdyvviii:YOUR_ACTUAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

## Alternative: Use URI Tab

If connection pooling doesn't work, try the **URI** tab:
- It will show a direct connection string
- Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Replace `[PASSWORD]` with your database password

## If You Don't Know Your Database Password

1. In Supabase Dashboard → Settings → Database
2. Scroll to **Database password** section
3. If you see "Reset database password" button, click it
4. Enter a new password (save it securely!)
5. Use this password in your connection string

## Example `.env` Entry

```env
# Option 1: Full connection string (recommended)
SUPABASE_DB_URL=postgresql://postgres.igqocjymgmhygdyvviii:MySecurePassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Option 2: Individual components (alternative)
SUPABASE_PROJECT_REF=igqocjymgmhygdyvviii
SUPABASE_DB_PASSWORD=MySecurePassword123
SUPABASE_DB_PORT=6543
SUPABASE_REGION=us-east-1
```

## Common Issues

### Issue: "getaddrinfo ENOTFOUND"
**Solution:** The hostname format is wrong. Make sure you're using the connection string from Supabase Dashboard, not constructing it manually.

### Issue: "password authentication failed"
**Solution:** Your database password is incorrect. Reset it in Supabase Dashboard and update your `.env` file.

### Issue: "connection timeout"
**Solution:** 
- Check your internet connection
- Verify Supabase project is active (not paused)
- Try direct connection (port 5432) instead of pooling (port 6543)

## After Updating `.env`

1. **Save the `.env` file**
2. **Restart the server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm start
   ```

3. **You should see:**
   ```
   ✅ Connected to Supabase PostgreSQL database
   ✅ Supabase database connection successful
   🚀 FinSight API server running on port 3000
   ```

