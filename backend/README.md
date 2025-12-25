# FinSight Backend API

## Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- AWS S3 bucket configured
- Firebase Admin SDK credentials

### Installation

```bash
cd backend
npm install
```

### Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the database to be provisioned

2. **Get Your Database Connection String**
   - Go to Project Settings → Database
   - Copy the connection string (use the "Connection pooling" option for better performance)
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres`

3. **Create Database Tables**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `database/supabase_schema.sql`
   - Run the SQL script to create all tables, indexes, and triggers

### Environment Setup

Create a `.env` file in the backend directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase Database
# Use connection pooling URL for better performance (port 6543)
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres
# Or use direct connection (port 5432)
# SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres

# Alternative: You can also use DATABASE_URL
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=finsight-documents-prod

# Firebase Admin
FIREBASE_PROJECT_ID=finsight-78ad1
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# JWT
JWT_SECRET=your_jwt_secret_key

# AI Services
AWS_TEXTRACT_REGION=us-east-1
```

### Running the Server

```bash
# Development
npm run dev

# Production
npm start
```

### Database Schema

The database schema is defined in `database/supabase_schema.sql`. This file includes:
- All table definitions
- Indexes for performance
- Triggers for automatic timestamp updates
- UUID generation support

To apply the schema:
1. Open Supabase SQL Editor
2. Copy the entire contents of `database/supabase_schema.sql`
3. Paste and run in the SQL Editor

### Supabase Connection Options

**Connection Pooling (Recommended for Production)**
- Port: 6543
- Better for handling multiple concurrent connections
- URL format: `postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres`

**Direct Connection**
- Port: 5432
- Direct database connection
- URL format: `postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`

### Troubleshooting

**Connection Issues:**
- Make sure your IP is allowed in Supabase dashboard (Settings → Database → Connection Pooling)
- Check that your password doesn't contain special characters that need URL encoding
- Verify the connection string format is correct

**SSL Errors:**
- Supabase requires SSL connections
- The code automatically handles SSL in production mode
- For development, SSL is optional but recommended
