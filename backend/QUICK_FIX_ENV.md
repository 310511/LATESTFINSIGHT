# Quick Fix for Database Connection

## The Problem
"Tenant or user not found" means the connection string format in your `.env` is wrong.

## Solution: Use Direct Connection Format

### Step 1: Get Your Password
1. Go to: https://supabase.com/dashboard/project/igqocjymgmhygdyvviii
2. Settings → Database
3. Find "Database password" section
4. Copy your password (or reset it if needed)

### Step 2: Update .env File

Open `LATESTFINSIGHT/backend/.env` and **replace** the `SUPABASE_DB_URL` line with:

```env
# Direct connection format (simplest - use this first)
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD_HERE@db.igqocjymgmhygdyvviii.supabase.co:5432/postgres

# Also update this
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@db.igqocjymgmhygdyvviii.supabase.co:5432/postgres
```

**Replace `YOUR_PASSWORD_HERE` with your actual password from Step 1.**

### Step 3: Alternative - Use Password Only

If you prefer, you can also just set:

```env
SUPABASE_DB_PASSWORD=your_actual_password_here
```

The code will automatically construct the direct connection string.

### Step 4: Restart Server

```bash
cd LATESTFINSIGHT/backend
npm start
```

## Expected Output

```
ℹ️  Using direct connection format
🔗 Connection: postgresql://postgres:****@db.igqocjymgmhygdyvviii.supabase.co:5432/postgres
✅ Connected to Supabase PostgreSQL database
✅ Supabase database connection successful
   Connected at: 2025-01-15 10:30:00
🚀 FinSight API server running on port 5000
```

## If Still Doesn't Work

1. **Verify password is correct:**
   - Go to Supabase Dashboard → Settings → Database
   - Reset password if needed
   - Make sure no extra spaces in .env file

2. **Get exact connection string from Supabase:**
   - Supabase Dashboard → Settings → Database
   - Scroll to "Connection string" section
   - Click "URI" tab
   - Copy the EXACT string shown
   - Replace `[YOUR-PASSWORD]` with your password
   - Use that in `.env`

3. **Check project status:**
   - Make sure your Supabase project is active (not paused)

## Important Notes

- **Username:** Should be `postgres` (not `postgres.igqocjymgmhygdyvviii` for direct connection)
- **Hostname:** Should be `db.igqocjymgmhygdyvviii.supabase.co` (not `aws-0-*.pooler.supabase.com`)
- **Port:** Should be `5432` for direct connection
- **Password:** No quotes, no spaces, exact password from Supabase

