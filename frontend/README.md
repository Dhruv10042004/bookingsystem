# Department Booking System – Frontend (React + Vite)

This is the React/Vite frontend for the Department Booking System. It provides role-based dashboards, timetable viewing/printing, booking creation, bulk timetable import, request management, and password management (forgot/reset/change).

The project pairs with the Node.js/Express/MongoDB backend located in `../backend`.

## Key Features

- Authentication with JWT (login/register via backend)
- Role-based UI: Admin, HOD, Teacher, Lab Assistant
- Create booking requests (with date picker and auto-filled faculty)
- View merged timetables with support for:
  - Multiple entries in a slot
  - Consecutive-slot merging (identical sets merge into one block)
  - Pending/approved/granted status coloring and visibility
- Bulk timetable import from Excel (admin)
- Requests review/approval flows (Admin → HOD)
- Password management:
  - Forgot Password (email link)
  - Reset Password page (token in URL)
  - Change Password (logged-in users)
- Print-friendly timetable PDF view

## Tech Stack

- React 18 + Vite
- React Router
- Material UI (MUI)
- Axios
- Date handling via native Date/formatting

## Monorepo Layout

```
bookingsystem/
  backend/          # Node/Express API, MongoDB models, auth, email
  frontend/         # This React app (Vite)
```

## Prerequisites

- Node.js >= 18
- npm >= 9
- Backend running locally or deployed (Render, etc.)

## Environment Configuration

The frontend calls the backend API. Configure the base URL by setting the variable inside the app or (recommended) using a Vite env variable.

1) Preferred: create `frontend/.env`

```
VITE_API_URL=http://localhost:5000/api
```

2) Make sure API usages read from this variable. Example pattern:

```js
// const API = import.meta.env.VITE_API_URL
```

If you see hard-coded lines (for quick testing), update them to use `VITE_API_URL` or ensure they point to your deployed backend (e.g. `https://<your-render-app>.onrender.com/api`).

Important cross-origin note:
- When hosting frontend on Vercel and backend on Render, ensure backend CORS allows:
  - `https://<your-frontend>.vercel.app`
  - Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
  - Headers: `Content-Type`, `Authorization`, `X-Requested-With`, `Accept`, `Origin`

## Backend Email (Password Reset) – Summary

For real password reset links, the backend uses Nodemailer with Gmail SMTP.

Required (on backend deployment):

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=<Gmail App Password>
FRONTEND_URL=https://<your-frontend>.vercel.app
NODE_ENV=production
```

Gmail App Password steps (high-level):
1) Enable 2-Step Verification in your Google account
2) Create an App Password (App: Mail, Device: Other → "Render App")
3) Use the 16-char app password as `EMAIL_PASSWORD`

Ports used by backend for Gmail SMTP (Render-compatible):
- Prefer 465 (SSL) or 587 (TLS). Port 25 is blocked on most hosts.

## Getting Started (Development)

1) Install dependencies

```
cd frontend
npm install
```

2) Start dev server

```
npm run dev
```

This runs the app on a Vite dev server (default `http://localhost:5173`).

3) Backend

Ensure your backend is running (default `http://localhost:5000`). Adjust `VITE_API_URL` if needed.

## Build

```
npm run build
```

Outputs production assets to `dist/`.

## Preview Production Build

```
npm run preview
```

## Deployment

Recommended: Deploy frontend on Vercel.

- Set `VITE_API_URL` in Vercel Project Settings → Environment Variables to your backend (Render) URL, e.g.:
  - `https://<your-render-app>.onrender.com/api`
- Re-deploy after env changes.

Make sure your backend CORS is configured to allow your Vercel domain.

## Notable Frontend Pages/Components

- `src/pages/Login.jsx` – Login + "Forgot Password" link
- `src/pages/ForgotPassword.jsx` – Sends reset email via backend
- `src/pages/ResetPassword.jsx` – Reads `?token=...` from URL and resets password
- `src/pages/ChangePassword.jsx` – Change password for logged-in users
- `src/pages/CreateBooking.jsx` – Create booking with date picker; faculty auto-filled
- `src/pages/ViewTimetable.jsx` – Timetable grid with merged consecutive slots, multi-entry blocks
- `src/pages/AdminTimeTableInput.jsx` – Bulk import from Excel (handles complex entries like multiple divisions, ranges, multiple entries per cell)
- `src/components/PrintTimeTable.jsx` – Print/PDF-friendly timetable
- `src/components/Navbar.jsx` – App navigation (includes Change Password)

## Timetable Notes

- Consecutive identical entries (same subject/faculty/class/status) are merged into one block.
- If slots contain the same set of multiple entries (e.g., `IS` + `ISIG` repeated), they merge into one block.
- For slots with multiple entries, a single unified box is shown with separators (no separate bordered boxes per entry).
- Pending approvals are visible in `ViewTimetable`.

## Bulk Import Notes (Excel)

The admin bulk import supports:
- Multiple entries within one cell (split by newline/semicolon)
- Division formats: `TY-I1,2,3`, `TY-I1-2` (ranges), and standard `YEAR-DIV` formats
- Faculty matching via codes/lookup

If your sheet's format differs, adjust the parsing utilities in `AdminTimeTableInput.jsx` accordingly.

## Common Issues & Troubleshooting

### CORS blocked between Vercel (frontend) and Render (backend)
- Ensure backend `CORS` middleware whitelists your Vercel domain and supports necessary methods/headers.
- Add route-level CORS for auth if needed.

### Password reset email not received
- Verify Gmail App Password is used (not the normal password)
- Confirm backend env vars: `EMAIL_USER`, `EMAIL_PASSWORD`, `FRONTEND_URL`, `NODE_ENV=production`
- Check Render logs for `EAUTH`, `ETIMEDOUT`, etc.
- Try switching between port 587 (TLS) and 465 (SSL) on the backend transporter.

### Timetable not merging as expected
- Confirm the comparison logic in `ViewTimetable.jsx` (`areEntriesIdentical`, set-wise merging) matches your data model.
- Check that faculty arrays and class objects are normalized before comparison.

### Bulk import not parsing correctly
- Ensure your Excel values follow the expected patterns. Update regex/parse functions in `AdminTimeTableInput.jsx` if needed.

## Scripts

```
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview the production build
```

## Acknowledgements

- React, Vite, Material UI, Axios
- Backend: Node.js, Express, Mongoose, Nodemailer

## License

This project is for departmental/educational use. Add a license here if you plan to open-source.
