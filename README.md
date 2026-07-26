# Department Booking System

A complete booking system for college departments, with:
- Node.js + Express backend with MongoDB (primary backend, in `backend/`)
- A Java Spring Boot port of the same API with MongoDB (in `booking-backend/`), functionally equivalent and usable as a drop-in replacement
- React + Vite frontend
- Role-based dashboards for Admin, HOD, Teacher, and Lab Assistant
- Booking creation, approval workflows, timetable viewing, and password recovery

## Repository Structure

```
bookingsystem/
  backend/          # Node.js API, auth, booking and room routes, email utilities
  booking-backend/  # Java Spring Boot port of backend/, same routes and MongoDB collections
  frontend/         # React app with dashboards, timetable views, and booking UI
```

## Key Features

- User registration and login with JWT authentication
- Role-specific UI flows and access control
- Booking requests with approval process
- Timetable display with merged slots and status highlighting
- Admin bulk timetable import from Excel
- Password reset via email
- Print-ready timetable PDF generation

## Prerequisites

- Node.js >= 18
- npm >= 9
- MongoDB Atlas or another MongoDB connection string
- (Optional, only if running the Java backend) JDK 17+ and Maven

## Setup

### 1. Backend (Node.js — `backend/`)

1. Open a terminal in `backend/`
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create a `.env` file with values similar to:

```env
MONGO_ATLAS_URI=<your-mongodb-uri>
JWT_SECRET=<your-secret>
EMAIL_USER=<your-email>
EMAIL_PASSWORD=<your-email-app-password>
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

4. Start the backend server:

```bash
npm run dev
```

The backend listens on port `5000` by default.

> A functionally equivalent Java Spring Boot backend also exists in `booking-backend/`. It uses the same MongoDB collections and exposes the same REST routes, so it can be run instead of the Node backend without frontend changes. See `booking-backend/README.md` for setup (requires `mvn spring-boot:run` and the same environment variables).

### 2. Frontend

1. Open a terminal in `frontend/`
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Create `frontend/.env` and set the backend API base URL (this is the variable actually read by the frontend code, via `import.meta.env.VITE_API_BASE_URL`):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

4. Start the frontend dev server:

```bash
npm run dev
```

The frontend runs on Vite's default port, usually `http://localhost:5173`.

## Running Locally

- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

> Ensure `frontend/.env` sets `VITE_API_BASE_URL` to point at the backend, and that the backend's CORS configuration (`ALLOWED_ORIGINS` in `backend/.env`) allows the frontend's origin.

## Environment Variables

### Backend (`backend/`)

Required:
- `MONGO_ATLAS_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `EMAIL_USER` - Email address used to send password reset and notification emails
- `EMAIL_PASSWORD` - SMTP password or app password for the email service (Gmail App Password recommended)
- `FRONTEND_URL` - Frontend base URL for email links
- `ALLOWED_ORIGINS` - Optional comma-separated list of allowed frontend origins
- `PORT` - Optional, defaults to `5000`

### Frontend

- `VITE_API_BASE_URL` - Backend API endpoint, e.g. `http://localhost:5000/api`. This is required for the app to reach the backend; every page that calls the API reads it via `import.meta.env.VITE_API_BASE_URL`.

## Deploying

### Backend

- Deploy on Render, Heroku, or another Node.js host (or deploy `booking-backend/` as a Java service if using the Spring Boot port)
- Set required env vars in the deployment platform
- Ensure CORS (`ALLOWED_ORIGINS`) allows your frontend origin(s)

### Frontend

- Deploy on Vercel, Netlify, or another static host
- Set `VITE_API_BASE_URL` to your deployed backend API URL
- Rebuild after env var changes

## Notes

- The backend includes email functionality for password reset and booking notifications, using Nodemailer with Gmail SMTP (see `backend/EMAIL_SETUP.md` and `backend/GMAIL_SETUP_RENDER.md` for details and troubleshooting).
- The frontend supports role-based dashboards and timetable printing.
- The repository stores the Node backend, the Java backend port, and the frontend separately for easier development and deployment.

## Useful Commands

### Backend (Node.js)

```bash
npm run dev
npm start
```

### Backend (Java, optional — `booking-backend/`)

```bash
mvn spring-boot:run
# or, to build a deployable jar:
mvn clean package
java -jar target/booking-backend-1.0.0.jar
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Production-Ready Improvements

If given more time, the following changes would make the booking system closer to production-ready:

- Add validation and sanitization on backend request data to prevent invalid or malicious input.
- Implement rate limiting and request throttling to protect the API from abuse.
- Harden authentication by using refresh tokens, secure cookie storage, and token expiry handling.
- Add role-based authorization checks in every route, not just UI-level protection.
- Move sensitive configuration to a secrets manager or platform env vars and avoid logging secrets (the current `backend/.env` and startup logs contain real credentials and should never be committed).
- Replace the temporary permissive CORS policy (`origin: true` in `backend/index.js`) with an explicit, trusted-origin allowlist.
- Add structured logging and centralized error reporting for backend issues.
- Add unit and integration tests for backend routes, auth, and booking flows.
- Add frontend component and API request tests, plus end-to-end coverage for key user journeys.
- Enable HTTPS for production frontend and backend traffic.
- Add CSRF protection if session-based auth is used or if cookies are introduced.
- Add database indexes, query optimization, and schema validation for MongoDB models.
- Implement deployment automation, build pipelines, and staging environment checks.
- Improve UI/UX with clearer validation errors, responsive design, accessibility support, and polished mobile layout.
- Add monitoring and alerting for uptime, performance, and email delivery failures.

## Contact

For questions or further improvements, edit the relevant files in `backend/`, `booking-backend/`, or `frontend/` and restart the servers.