# HRM Backend — Setup

## 1. MongoDB Atlas (free)
1. Create an account at cloud.mongodb.com → **Build a Database** → **M0 Free**.
2. Region: **Mumbai (ap-south-1)** for lowest latency in India.
3. Database Access → Add User (username + password).
4. Network Access → Add IP → `0.0.0.0/0` for development.
5. Connect → Drivers → copy the connection string.

## 2. Install
```bash
cd server
npm install
cp .env.example .env      # then paste your MONGO_URI and set JWT_SECRET
npm run seed              # creates departments + first HR account
npm run migrate:roles     # existing databases only: moves old "admin" logins to "hr"
npm run dev
```

Default login: `hr@enigoal.com` / `Enigoal@123` — change it right after first login.

## 3. Environment variables
| Key | Purpose |
|---|---|
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ORG_CODE` | Prefix on employee IDs — `ENG` gives `ENG-26-0001` |
| `MAX_FILE_MB` | Upload cap, default 2 |
| `CLIENT_URL` | Frontend origin for CORS |

## 4. API reference

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| PUT | `/api/auth/password` | any |
| GET/POST | `/api/auth/users` | hr, manager |
| PATCH | `/api/auth/users/:id` | hr, manager |

### Employees
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/employees` | any (managers see only their team) |
| POST | `/api/employees` | hr — **generates the employee ID** |
| GET/PUT | `/api/employees/:id` | self, manager-of, hr |
| DELETE | `/api/employees/:id` | hr (`?hard=true` for permanent) |
| POST | `/api/employees/:id/photo` | self, hr |
| GET | `/api/employees/verify/:employeeId` | **public** — QR target |
| GET | `/api/employees/stats/overview` | hr |

### Attendance (HR-marked)
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/attendance/sheet?date=` | hr, manager |
| POST | `/api/attendance/bulk` | hr, manager |
| POST | `/api/attendance/mark-all` | hr |
| PUT | `/api/attendance/:id` | hr |
| GET | `/api/attendance/employee/:id?year=&month=` | self, manager-of, hr |
| GET | `/api/attendance/summary?date=` | hr, manager |
| GET | `/api/attendance/report?from=&to=` | hr |

### Documents (GridFS)
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/documents` | self, hr (multipart `file`) |
| GET | `/api/documents?employee=` | self sees own; hr sees all |
| GET | `/api/documents/:id/download?inline=true` | self, hr |
| PATCH | `/api/documents/:id/verify` | hr |
| DELETE | `/api/documents/:id` | self (if unverified), hr, manager |
| GET | `/api/documents/storage` | hr — 512 MB usage meter |
| GET | `/api/documents/missing/:employeeId` | any |

### Leave
`GET/POST /api/leaves`, `PATCH /api/leaves/:id/action`, `PATCH /api/leaves/:id/cancel`

## 5. Design notes worth knowing

**Employee ID** is generated atomically in `utils/generateEmployeeId.js` using a `Counter` collection with `$inc`. Never replace this with `countDocuments() + 1` — two simultaneous requests produce the same ID and the unique index will throw.

**Attendance dates** are normalised to midnight IST (`utils/date.js`) before storage. The `{ employee, date }` unique index depends on this; without it, re-marking creates duplicates.

**Storage is a swappable layer.** Everything goes through `config/storage.js`. When GridFS gets tight on the 512 MB free tier, rewrite only that file for Cloudinary/S3 — keep `saveFile`, `getFileStream`, `deleteFile`, `storageUsed` signatures identical and nothing else changes.

**Images are compressed before upload** (`utils/compress.js`) — resized to 1600px and re-encoded as JPEG at q78. A 4 MB phone photo of an Aadhaar card lands at roughly 250 KB, which is the difference between 130 documents and 2000 on the free tier.

**Approving leave writes to attendance automatically**, so HR does not mark the same absence twice.

## 6. Deployment (free)
- Backend → Render Web Service. Build `npm install`, start `npm start`, add all env vars.
- Set `CLIENT_URL` to your Vercel domain and `NODE_ENV=production` (this switches cookies to `secure` + `sameSite=none`).
- Render free tier sleeps after 15 min idle; first request takes ~50s to wake.
