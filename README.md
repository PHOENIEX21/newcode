# Morning Meeting Attendance

Mobile-first attendance for an in-person morning meeting.

## Roles
- Admin manages members, the daily code, opening/closing attendance, cut-off time, reports and CSV exports.
- Agents only need the public attendance link and announce the code in the room.
- Members select their own name, enter the current 4-digit code and mark once per day.

## Safeguards
- The daily code is validated only on the server and is never returned by the public API.
- Attendance can be explicitly opened and closed.
- The database enforces one attendance record per member per Lagos calendar day.
- Late/on-time status is calculated when the member submits.
- Absence is derived from genuine submissions rather than inserted as fake records.
- Admin sessions use an HTTP-only signed cookie.
- Members are deactivated instead of deleting their history.

## Required environment variables
DATABASE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET.

The PostgreSQL tables and indexes are created automatically on first use.

## Local start
Run npm install, add the environment variables in .env.local, then run npm run dev.


- Mobile admin category dashboard: monthly Members / Present / Absent / Late cards with expandable member details.

<!-- vercel reconnect test 1791016119289 -->

<!-- deploy current monthly horizontal-scroll table -->

<!-- final production deploy: session-based attendance accounting -->

<!-- production release trigger after final green CI -->
