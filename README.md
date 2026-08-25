# HRM — Employee, Attendance & Document Management

MERN stack. HR-marked attendance, GridFS document storage, auto-issued employee IDs with QR-verified ID cards, and role-based access (HR, Manager, and the three team roles).

```
hrm/
├── server/     Node + Express + MongoDB (see server/README.md for full API reference)
└── client/     React + Vite + Tailwind
```

## Quick start

You need Node 18+ and a free MongoDB Atlas account.

### 1. Database
1. cloud.mongodb.com → Build a Database → **M0 Free** → region **Mumbai (ap-south-1)**
2. Database Access → add a user
3. Network Access → add IP `0.0.0.0/0`
4. Connect → Drivers → copy the connection string

### 2. Backend
```bash
cd server
npm install
cp .env.example .env       # paste MONGO_URI, set JWT_SECRET
npm run seed               # departments + first HR account
npm run dev                # http://localhost:5000
```

### 3. Frontend
```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

Vite proxies `/api` to port 5000, so no CORS setup is needed in development.

**First login:** `hr@enigoal.com` / `Enigoal@123` — change it under Settings immediately.

> Upgrading an existing database? The `admin` role has been removed. Seeding alone is not enough —
> run `npm run migrate:roles` inside `server/` once, which moves any old `admin` login to `hr`.

## What each role can do

| | HR | Manager | Employee |
|---|---|---|---|
| Dashboard | ✓ | ✓ | own stats |
| Add / edit employees | ✓ | own team | own contact details |
| Delete employees | ✓ | — | — |
| Mark attendance | ✓ | own team | view own |
| Period report + CSV | ✓ | — | — |
| Upload documents | ✓ | ✓ | own only |
| Verify documents | ✓ | — | — |
| Approve leave | ✓ | own team | apply only |
| Settings — users & roles | ✓ | ✓ | — |

## The daily flow

1. Open **Attendance**, pick the date
2. **Fill unmarked as present** — one click sets everyone
3. Change the handful of exceptions to A / H / L / W
4. **Save sheet**

Saving is an upsert against a `{employee, date}` unique index, so re-saving corrects records instead of duplicating them. Anyone left unmarked is auto-recorded as absent (or week off on Sundays) by a cron job at 11:55 PM IST, so payroll reports never have silent gaps.

## Employee IDs

Issued server-side by an atomic `$inc` counter the moment HR saves a new employee — format `ENG-26-0001`, controlled by `ORG_CODE` in `.env`. IDs are immutable: `employeeId` is stripped from every update payload. Each ID card carries a QR code pointing at `/verify/<employeeId>`, a public page that reads live status, so a card belonging to an exited employee shows as invalid.

## Storage

Documents live in MongoDB via GridFS. Images are auto-resized to 1600px and re-encoded as JPEG q78 before storage, so a 4 MB phone photo of an Aadhaar card lands around 250 KB. The Documents page shows a live meter against the 512 MB free-tier cap.

Everything goes through `server/src/config/storage.js`. To move to Cloudinary or S3 later, rewrite that one file keeping the `saveFile` / `getFileStream` / `deleteFile` / `storageUsed` signatures — nothing else changes.

## Deploying free

- **Frontend** → Vercel. Root directory `client`, set `VITE_API_URL` to your backend URL + `/api`.
- **Backend** → Render web service. Root directory `server`, build `npm install`, start `npm start`. Add every `.env` variable, set `NODE_ENV=production` and `CLIENT_URL` to your Vercel domain.

Render's free tier sleeps after 15 minutes idle — the first request afterwards takes about 50 seconds.

## Theme

Blue and white, defined once in `client/tailwind.config.js`. Machine-issued identifiers (employee IDs, counts, dates, storage figures) always render in JetBrains Mono via the `.ident` class, so an ID reads as an issued artifact rather than ordinary text.
