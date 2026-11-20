# CSMS Setup Guide

## Prerequisites

Before setting up the Community Service Monitoring System, ensure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** (optional, for version control)

## Quick Start

### 1. Database Setup

1. **Create PostgreSQL Database:**
   ```sql
   CREATE DATABASE csms_db;
   CREATE USER csms_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE csms_db TO csms_user;
   ```

2. **Configure Environment Variables:**
   - Copy `backend/.env.example` to `backend/.env`
   - Update the database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=csms_db
   DB_USER=csms_user
   DB_PASSWORD=your_secure_password
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   ```

### 2. Backend Setup

```bash
cd backend
npm install
npm run migrate  # Creates database tables
npm run seed     # (Optional) Adds sample data
npm run dev      # Starts development server on port 5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on port 3000
```

## Default Login Credentials

After running migrations and seeding:

**Admin Account:**
- Email: `admin@ccs.edu`
- Password: `admin123`

**Sample Student Account:**
- Email: `john.doe@student.ccs.edu`
- Password: `password123`

**Faculty Account:**
- Email: `faculty@ccs.edu`
- Password: `password123`

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_NAME=your_production_db_name
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
JWT_SECRET=your_very_secure_jwt_secret_key
PORT=5000
```

### Build and Deploy

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd ../backend
npm start
```

## Features Overview

### Admin Dashboard
- ✅ Create and manage events (CCS Meet, Campus Meet, etc.)
- ✅ View system analytics and attendance statistics
- ✅ Manage community service tasks
- ✅ Track student service hours
- ✅ Mark attendance via matrix (students × events)

### Faculty Dashboard
- ✅ Create and manage tasks
- ✅ View attendance analytics (limited scope)
- 🔄 Grade task completions (coming soon)

### Student Dashboard
- ✅ View personal service hour progress
- ✅ Browse and apply for available tasks
- ✅ Check upcoming events and calendar
- ✅ View attendance history

## System Architecture

```
CSMS/
├── backend/          # Express.js API Server
│   ├── routes/       # API endpoints
│   ├── middleware/   # Authentication & validation
│   ├── config/       # Database configuration
│   └── server.js     # Main server file
├── frontend/         # React.js Application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context (Auth)
│   │   └── utils/       # Utility functions
│   └── public/       # Static assets
├── database/         # Database schema & migrations
└── docs/            # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event (Admin only)
- `PUT /api/events/:id` - Update event (Admin only)
- `DELETE /api/events/:id` - Delete event (Admin only)

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task (Admin/Faculty)
- `POST /api/tasks/:id/apply` - Apply for task (Students)
- `GET /api/tasks/my-applications` - Get user's applications

### Dashboard
- `GET /api/dashboard` - Get dashboard data (role-specific)
- `GET /api/dashboard/analytics` - Get analytics data (Admin/Faculty)

## Troubleshooting

### Common Issues

1. **Database Connection Error:**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Port Already in Use:**
   - Backend: Change `PORT` in `.env`
   - Frontend: Set `PORT=3001` in frontend `.env`

3. **JWT Token Issues:**
   - Ensure `JWT_SECRET` is set in `.env`
   - Clear browser localStorage if needed

4. **CORS Issues:**
   - Verify frontend URL in backend CORS configuration
   - Check proxy setting in frontend `package.json`

### Development Tips

- Use `npm run dev` for backend hot-reload with nodemon
- Frontend proxy is configured to route API calls to backend
- Check browser console for detailed error messages
- Use PostgreSQL admin tools like pgAdmin for database management

## Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review the API documentation
3. Contact the development team

## License

MIT License - See LICENSE file for details.
