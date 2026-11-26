-- Community Service Monitoring System Database Schema

-- Users table (Admin, Faculty, Students)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'faculty', 'student')),
    year_level INTEGER,
    section VARCHAR(10),
    total_required_hours INTEGER DEFAULT 120,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Events', 'FRC')),
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    penalty_hours INTEGER DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
    am_in BOOLEAN DEFAULT false,
    am_out BOOLEAN DEFAULT false,
    pm_in BOOLEAN DEFAULT false,
    pm_out BOOLEAN DEFAULT false,
    remarks TEXT,
    recorded_by INTEGER REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);

-- Community Service Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),
    hours_offered INTEGER NOT NULL,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    task_date DATE,
    start_time TIME,
    end_time TIME,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Applications table
CREATE TABLE task_applications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    hours_rendered INTEGER DEFAULT 0,
    remarks TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_id)
);

-- Community Service Hours Log
CREATE TABLE service_hours (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hours INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('penalty', 'task', 'adjustment')),
    source_id INTEGER, -- References task_id, event_id, or null for manual adjustments
    source_type VARCHAR(20), -- 'task', 'event', 'manual'
    description TEXT,
    recorded_by INTEGER REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_attendance_user_event ON attendance(user_id, event_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_date ON tasks(task_date);
CREATE INDEX idx_service_hours_user ON service_hours(user_id);
CREATE INDEX idx_service_hours_type ON service_hours(type);

-- Insert default admin user (password: admin123)
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role) 
VALUES ('ADMIN001', 'admin@ccs.edu', '$2a$10$OqYDBoVNtpp898Dz2Ht6JOjqquZMrPmcay07UJEHdSUcPpgdRDu0a', 'System', 'Administrator', 'admin');
