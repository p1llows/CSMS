const path = require('path');
const fs = require('fs');
const { pool } = require('../../backend/config/database');

async function run() {
  const sqlPath = path.join(__dirname, '20250824_allow_frc_and_events.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    console.log('Running migration: Allow only two event types (Events, FRC) and convert legacy types');
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
