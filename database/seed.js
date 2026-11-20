const { pool } = require('../backend/config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Seed sample students
    const students = [
      ['2021-001', 'john.doe@student.ccs.edu', '$2a$10$qgZOAz7BzyiygAQ5z8aW5ukSgPhgydf7ucFRvcR72b6Si/QjOk.Zu', 'John', 'Doe', 'student', 3, 'A'],
      ['2021-002', 'jane.smith@student.ccs.edu', '$2a$10$qgZOAz7BzyiygAQ5z8aW5ukSgPhgydf7ucFRvcR72b6Si/QjOk.Zu', 'Jane', 'Smith', 'student', 3, 'A'],
      ['2022-001', 'mike.johnson@student.ccs.edu', '$2a$10$qgZOAz7BzyiygAQ5z8aW5ukSgPhgydf7ucFRvcR72b6Si/QjOk.Zu', 'Mike', 'Johnson', 'student', 2, 'B'],
      ['2022-002', 'sarah.wilson@student.ccs.edu', '$2a$10$qgZOAz7BzyiygAQ5z8aW5ukSgPhgydf7ucFRvcR72b6Si/QjOk.Zu', 'Sarah', 'Wilson', 'student', 2, 'B'],
    ];

    for (const student of students) {
      await pool.query(
        'INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, year_level, section) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        student
      );
    }

    // Seed faculty
    await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
      ['faculty@ccs.edu', '$2a$10$qgZOAz7BzyiygAQ5z8aW5ukSgPhgydf7ucFRvcR72b6Si/QjOk.Zu', 'Dr. Maria', 'Garcia', 'faculty']
    );

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Sample data created:');
    console.log('   - 4 sample students');
    console.log('   - 1 faculty member');
    // console.log('   - 4 sample events'); // Events seeding removed
    console.log('🔑 All users have password: "password123"');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
