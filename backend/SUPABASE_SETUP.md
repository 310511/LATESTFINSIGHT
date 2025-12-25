# Supabase Setup Guide

## Step-by-Step Instructions

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `finsight` (or your preferred name)
   - Database password: Create a strong password (save this!)
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for the project to be created

### 2. Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Select **Connection pooling** tab (recommended for production)
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password
6. Replace `[PROJECT-REF]` with your actual project reference

**Example connection string:**
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:6543/postgres
```

### 3. Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `database/supabase_schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

### 4. Verify Tables Created

1. In Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - `users`
   - `documents`
   - `processing_results`
   - `processing_history`
   - `user_settings`
   - `support_tickets`
   - `analytics`

### 5. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Supabase Database Connection
SUPABASE_DB_URL=postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:6543/postgres

# Other environment variables...
PORT=3000
NODE_ENV=development
```

### 6. Test Connection

Run the server:
```bash
npm start
```

You should see:
```
✅ Connected to Supabase PostgreSQL database
✅ Supabase database connection successful
🚀 FinSight API server running on port 3000
```

## Connection String Formats

### Connection Pooling (Recommended)
- **Port:** 6543
- **Use for:** Production, high-traffic applications
- **Format:** `postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres`

### Direct Connection
- **Port:** 5432
- **Use for:** Development, migrations, one-off queries
- **Format:** `postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`

## Security Notes

1. **Never commit your `.env` file** to version control
2. Use connection pooling in production for better performance
3. Enable Row Level Security (RLS) if using Supabase Auth
4. Keep your database password secure

## Troubleshooting

### Connection Refused
- Check that your IP is allowed (Settings → Database → Connection Pooling)
- Verify the connection string format
- Make sure the password doesn't have special characters that need URL encoding

### SSL Errors
- Supabase requires SSL connections
- The code handles SSL automatically
- If issues persist, check your Node.js version (18+ recommended)

### Table Not Found
- Make sure you ran the `supabase_schema.sql` script
- Check the SQL Editor for any errors
- Verify tables exist in Table Editor

## Next Steps

After setup:
1. Test API endpoints
2. Upload a test document
3. Check that data is being saved to Supabase
4. Monitor your Supabase dashboard for usage

