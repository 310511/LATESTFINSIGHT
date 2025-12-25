require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing Supabase Database Connection...\n');

// Get connection string from env
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'igqocjymgmhygdyvviii';

console.log('📋 Environment Check:');
console.log(`   SUPABASE_DB_URL: ${connectionString ? '✅ Set' : '❌ Not set'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   SUPABASE_DB_PASSWORD: ${dbPassword ? '✅ Set' : '❌ Not set'}`);
console.log(`   SUPABASE_PROJECT_REF: ${projectRef}\n`);

// Test different connection formats
const regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1'];
const connectionFormats = [];

// Try different regions
regions.forEach(region => {
  connectionFormats.push(
    {
      name: `Transaction Pooler (${region}, port 6543)`,
      url: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`
    },
    {
      name: `Session Pooler (${region}, port 5432)`,
      url: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${region}.pooler.supabase.com:5432/postgres`
    },
    {
      name: `Direct with pooler (${region}, port 5432)`,
      url: `postgresql://postgres:${dbPassword}@aws-0-${region}.pooler.supabase.com:5432/postgres`
    }
  );
});

// Also try direct connection format
if (dbPassword) {
  connectionFormats.push({
    name: 'Direct Connection (db.*.supabase.co)',
    url: `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`
  });
}

// If connection string is provided, test it first
if (connectionString && !connectionString.includes('[YOUR')) {
  connectionFormats.unshift({
    name: 'From SUPABASE_DB_URL',
    url: connectionString
  });
}

async function testConnection(name, url) {
  const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${maskedUrl}`);
  
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    const result = await pool.query('SELECT NOW() as now, current_database() as db, current_user as user');
    console.log(`   ✅ SUCCESS!`);
    console.log(`   Database: ${result.rows[0].db}`);
    console.log(`   User: ${result.rows[0].user}`);
    console.log(`   Time: ${result.rows[0].now}`);
    await pool.end();
    return true;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    await pool.end();
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 Starting connection tests...\n');
  
  for (const format of connectionFormats) {
    if (!dbPassword && format.url.includes('${dbPassword}')) {
      console.log(`\n⏭️  Skipping ${format.name} - password not set`);
      continue;
    }
    
    const success = await testConnection(format.name, format.url);
    if (success) {
      console.log(`\n✅ Working connection format found: ${format.name}`);
      console.log(`\n📝 Add this to your .env file:`);
      console.log(`SUPABASE_DB_URL=${format.url}`);
      process.exit(0);
    }
  }
  
  console.log('\n❌ None of the connection formats worked.');
  console.log('\n💡 Next steps:');
  console.log('   1. Verify your database password in Supabase Dashboard');
  console.log('   2. Make sure your project is not paused');
  console.log('   3. Get the exact connection string from:');
  console.log('      Supabase Dashboard → Settings → Database → Connection string');
  process.exit(1);
}

runTests().catch(console.error);

