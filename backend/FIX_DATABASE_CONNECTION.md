# Fix Database Connection Issues

## Problem
The error `getaddrinfo ENOTFOUND db.igqocjymgmhygdyvviii.supabase.co` means the hostname cannot be resolved.

## Solution

### Option 1: Get the Correct Connection String from Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/igqocjymgmhygdyvviii
   - Navigate to **Settings** → **Database**

2. **Copy the Connection String:**
   - Scroll to **Connection string** section
   - Select **Connection pooling** tab
   - Copy the connection string (it should look like):
     ```
     postgresql://postgres.igqocjymgmhygdyvviii:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with your actual database password

3. **Add to `.env` file:**
   ```env
   SUPABASE_DB_URL=postgresql://postgres.igqocjymgmhygdyvviii:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### Option 2: Use Individual Components

If you prefer to use individual components, add to `.env`:

```env
SUPABASE_PROJECT_REF=igqocjymgmhygdyvviii
SUPABASE_DB_PASSWORD=your_actual_database_password_here
SUPABASE_DB_PORT=6543
```

The code will automatically construct the connection string.

### Option 3: Direct Connection (Alternative)

If connection pooling doesn't work, try direct connection:

1. In Supabase Dashboard → Settings → Database
2. Select **Direct connection** tab
3. Copy the connection string
4. It should look like:
   ```
   postgresql://postgres.igqocjymgmhygdyvviii:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

## Important Notes

1. **Database Password:**
   - Get it from: Supabase Dashboard → Settings → Database → Database password
   - If you forgot it, you can reset it in the same location

2. **SSL Required:**
   - Supabase requires SSL connections
   - The code automatically handles SSL

3. **Connection Pooling vs Direct:**
   - **Connection Pooling (port 6543):** Recommended for production, handles multiple connections better
   - **Direct Connection (port 5432):** For migrations and one-off queries

4. **URL Encoding:**
   - If your password contains special characters, they will be automatically URL-encoded

## Test Connection

After updating your `.env` file, restart the server:

```bash
npm start
```

You should see:
```
✅ Connected to Supabase PostgreSQL database
✅ Supabase database connection successful
🚀 FinSight API server running on port 3000
```

## Troubleshooting

### Still Getting Connection Errors?

1. **Check your password:**
   - Make sure you copied the password correctly
   - No extra spaces or quotes

2. **Check your network:**
   - Ensure you have internet connection
   - Check if Supabase is accessible

3. **Verify project is active:**
   - Go to Supabase Dashboard
   - Make sure your project is not paused

4. **Try different connection format:**
   - Try direct connection instead of pooling
   - Or vice versa

5. **Check firewall/proxy:**
   - Some corporate networks block database connections
   - Try from a different network if possible

