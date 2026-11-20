# Community Service Monitoring System (CSMS)

A comprehensive web-based system for managing community service hours for BSCS students at the College of Computer Science.

## Features

### Admin Dashboard
- Create and manage school events (CCS Meet, Campus Meet, University Meet, Students' Day, CCS Week)
- Mark attendance via matrix (students × events)
- Assign/deduct community service hours (10 hrs per missed event, 3 hrs per missed flag-raising)
- Post and manage community service tasks
- View comprehensive analytics and reports

### Faculty Dashboard
- Post and manage tasks within faculty scope
- Deduct rendered hours from students
- View attendance and analytics (limited scope)

### Student Dashboard
- Personal service hour tracking
- View missed events and required hours
- Browse and apply for available tasks
- Calendar view of upcoming events and flag-raising schedule

## Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Radix UI
- **Backend:** Node.js, Express.js
- **Database Driver:** Native PostgreSQL Client (`pg`)
- **Database:** PostgreSQL (v12+)
- **Authentication:** JWT (JSON Web Tokens)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation & Setup

1. **Install Dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure Environment:**
   - Copy `backend/.env.example` to `backend/.env` (or configure `DATABASE_URL` and `JWT_SECRET`).

3. **Run Database Migrations & Seeds:**
   ```bash
   cd backend
   npm run migrate
   npm run seed      # Optional: seeds sample users
   ```

4. **Start Development Servers:**
   - Backend:
     ```bash
     cd backend && npm run dev
     ```
   - Frontend:
     ```bash
     cd frontend && npm run dev
     ```

## Project Structure

```
CSMS/
├── backend/          # Express.js API server (pg client, routes, middleware)
├── frontend/         # React.js application (Vite, Tailwind CSS)
├── database/         # PostgreSQL schema and SQL migrations
└── docs/             # Documentation
```

## License

MIT License
