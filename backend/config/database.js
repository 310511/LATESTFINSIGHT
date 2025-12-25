const { Pool } = require('pg');

// Supabase PostgreSQL connection
// Support multiple connection string formats
let connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

// Check if connection string has placeholder password
const hasPlaceholder = connectionString && (
  connectionString.includes('[YOUR-DATABASE-PASSWORD]') || 
  connectionString.includes('[YOUR-PASSWORD]') ||
  connectionString.includes('YOUR_PASSWORD')
);

// If connection string is not provided or has placeholder, try to construct it
if (!connectionString || hasPlaceholder) {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF || 'igqocjymgmhygdyvviii';
  
  if (dbPassword && !dbPassword.includes('[YOUR') && !dbPassword.includes('YOUR_')) {
    // Try direct connection format first (simplest and most reliable)
    // This is the format shown in Supabase Dashboard → Settings → Database → URI tab
    connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
    console.log('ℹ️  Using direct connection format (from SUPABASE_DB_PASSWORD)');
  } else {
    console.error('❌ Database connection string not found or password not set.');
    console.error('\n📋 To fix this:');
    console.error('   1. Go to Supabase Dashboard → Settings → Database');
    console.error('   2. Copy your database password (or reset it)');
    console.error('   3. Add to .env file:');
    console.error('      SUPABASE_DB_PASSWORD=your_actual_password');
    console.error('   OR use full connection string from Supabase Dashboard:');
    console.error('      SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.igqocjymgmhygdyvviii.supabase.co:5432/postgres');
    console.error('\n   Project Reference: igqocjymgmhygdyvviii');
    process.exit(1);
  }
}

// Log connection string (without password) for debugging
if (connectionString) {
  const maskedString = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔗 Connection: ${maskedString}`);
}

// Ensure SSL is enabled for Supabase (required)
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Supabase uses SSL certificates
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 15000, // Increased timeout for initial connection
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to Supabase database:', err.message);
    console.error('\n🔧 Troubleshooting:');
    
    if (err.message.includes('Tenant or user not found') || err.message.includes('password authentication failed')) {
      console.error('   → Wrong username or password format');
      console.error('   → For direct connection, username should be: postgres');
      console.error('   → For pooling, username should be: postgres.igqocjymgmhygdyvviii');
      console.error('   → Verify your password in Supabase Dashboard → Settings → Database');
      console.error('\n   💡 Try this in .env:');
      console.error('      SUPABASE_CONNECTION_TYPE=direct');
      console.error('      SUPABASE_DB_PASSWORD=your_password');
    } else if (err.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('   → Wrong hostname format');
      console.error('   → Get exact connection string from Supabase Dashboard');
    }
    
    console.error('\n   📖 Get connection string from:');
    console.error('      Supabase Dashboard → Settings → Database → Connection string');
    console.error('   Try different connection types:');
    console.error('      - Direct connection (port 5432)');
    console.error('      - Session pooler (port 5432)');
    console.error('      - Transaction pooler (port 6543)');
  } else {
    console.log('✅ Supabase database connection successful');
    console.log(`   Connected at: ${res.rows[0].now}`);
  }
});

module.exports = pool;
