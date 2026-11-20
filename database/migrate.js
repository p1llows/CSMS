const fs = require('fs');
const path = require('path');
const { pool } = require('../backend/config/database');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database migrations completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - events');
    console.log('   - attendance');
    console.log('   - tasks');
    console.log('   - task_applications');
    console.log('   - service_hours');
    console.log('👤 Default admin user created (email: admin@ccs.edu, password: admin123)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
