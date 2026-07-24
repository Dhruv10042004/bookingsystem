# Booking Backend — Java Spring Boot port

This is a 1:1 functional port of the original `backend/` (Node + Express +
Mongoose) API to **Java 17 + Spring Boot 3 + Spring Data MongoDB**. It talks
to the **same MongoDB Atlas database** and exposes the **same REST routes**,
so the existing React frontend can keep working unchanged — you only need to
point it at wherever this backend is deployed.

## Why this works as a drop-in replacement

- Same collections (`users`, `faculties`, `bookings`, `rooms`) and same
  document shapes (`_id`, `class: {year, division}`, `schedule[]`, etc.).
- Same JSON response shapes (`_id` instead of Java's usual `id`, `class`
  instead of `classInfo`, etc.) — handled via `@JsonProperty`/`@Field`
  annotations on the model classes.
- Same JWT contents (`id`, `role`, `name`, `email`), same `Authorization:
  Bearer <token>` header, same 1‑hour expiry.
- Same routes, same request bodies, same error shape (`{ "error": "..." }`),
  same success shapes.

## Project layout

```
src/main/java/com/djsce/booking/
  BookingBackendApplication.java     # main() / @SpringBootApplication
  config/
    CorsConfig.java                  # permissive CORS (mirrors origin: true in index.js)
    GlobalExceptionHandler.java      # turns auth/role errors into {"error": "..."} JSON
    FacultyDataSeeder.java           # seeds the faculty list once, if empty (like falcultySeed.js)
  security/
    JwtUtil.java                     # sign/verify JWTs (io.jsonwebtoken / jjwt)
    JwtAuthFilter.java                # reads Authorization header on every request
    AuthUser.java                    # req.user equivalent
    AuthUtil.java                    # requireAuth()/requireRole()/optionalAuth() helpers
  model/            # User, Faculty, Booking, Room, ScheduleEntry, ClassInfo
  repository/       # Spring Data MongoDB repositories
  service/
    EmailService.java                # same HTML emails as emailService.js, via JavaMailSender
    ExpiredBookingsService.java      # @Scheduled hourly job (removeExpiredBookings.js, but automatic)
  controller/
    AuthController.java              # /api/auth/**   (routes/auth.js)
    BookingController.java           # /api/bookings/** (routes/bookings.js)
    RoomController.java              # /api/rooms/**  (routes/rooms.js)
```

## Environment variables

Copy `.env.example` to `.env` (or set these directly in your host's config,
e.g. Render's Environment tab) — names match the old Node backend 1:1:

| Variable | Purpose |
|---|---|
| `MONGO_ATLAS_URI` | MongoDB connection string |
| `PORT` | HTTP port (defaults to 5000) |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | Used to build password-reset links |
| `ALLOWED_ORIGINS` | Comma-separated list (CORS is actually wide open here, same as the Node version's temporary `origin: true`) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | Gmail address + App Password for sending mail |
| `DEFAULT_ADMIN_EMAIL` | (unused fallback, kept for parity) |

Spring Boot reads plain environment variables automatically (no `dotenv`
package needed) — just export them before running, or configure them in
your hosting platform.

## Running locally

Requires JDK 17+ and Maven (or use the Maven wrapper if you add one).

```bash
cd booking-backend
export MONGO_ATLAS_URI="..."
export JWT_SECRET="..."
export EMAIL_USER="..."
export EMAIL_PASSWORD="..."
mvn spring-boot:run
```

The server starts on `http://localhost:5000` by default — the same port the
Node backend used, so `frontend/.env`'s
`REACT_APP_API_URL=http://localhost:5000/api` (or any hardcoded
`http://localhost:5000/api` in the frontend pages) keeps working untouched.

## Building a deployable jar

```bash
mvn clean package
java -jar target/booking-backend-1.0.0.jar
```

## Deploying (e.g. Render)

1. Push this folder as its own repo/service.
2. Build command: `mvn clean package -DskipTests`
3. Start command: `java -jar target/booking-backend-1.0.0.jar`
4. Set the environment variables from the table above in Render's dashboard.
5. Update the frontend's hardcoded `API` constants (currently pointing at
   `https://bookingsystem-e4oz.onrender.com/api`) to your new backend's URL.

## Endpoint reference (unchanged from the Node API)

**Auth** — `/api/auth`
- `POST /register`, `POST /login`
- `POST /add-faculty`, `DELETE /remove-faculty`, `PUT /update-faculty`, `GET /faculty-list`
- `POST /forgot-password`, `POST /reset-password`, `POST /change-password`

**Bookings** — `/api/bookings`
- `GET /test-email`
- `POST /` (create), `GET /` (list all — Admin/HOD), `GET /teacher` (mine)
- `PUT /admin/approve/:id`, `PUT /admin/reject/:id`
- `PUT /hod/grant/:id`, `PUT /hod/reject/:id`
- `DELETE /delete-all`

**Rooms** — `/api/rooms`
- `POST /add-rooms`, `GET /`
- `GET /:roomName/timetable`, `GET /available`, `GET /:roomName/available-week`
- `POST /add`
- `PUT /:roomName/schedule/:entryId`, `DELETE /:roomName/schedule/:entryId`
- `DELETE /:roomName`

## Notes / minor differences from the Node version

- Auth is done with a lightweight custom `JwtAuthFilter` + per-controller
  `AuthUtil.requireAuth()/requireRole()` calls rather than the full Spring
  Security framework — this keeps the behavior (and error messages)
  extremely close to the original `authenticateUser`/`authorizeRole`/
  `optionalAuth` Express middleware, without pulling in a heavier framework
  than the original app had.
- Booking ↔ room-schedule matching on approve/reject/grant is done by
  day + start/end time (the Node version additionally compared the exact
  stored date in some routes and not others — this port matches on
  day+time consistently across all four actions, which is slightly more
  lenient but avoids a class of edge-case mismatches from the original).
- Expired-booking cleanup runs automatically every hour (`@Scheduled`)
  instead of only when manually invoked, since Node's `removeExpiredBookings.js`
  wasn't wired into a cron/interval anywhere in the given code.
- Emails are dispatched on a plain background `Thread` per call, mirroring
  the Node "fire-and-forget" `sendEmailAsync` pattern; for heavier load
  you'd want to swap this for a proper `@Async` thread pool or a queue.
- No automated tests included — recommend adding `@SpringBootTest` /
  `@WebMvcTest` coverage before relying on this in production.
