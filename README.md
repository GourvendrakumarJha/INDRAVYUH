# INDRAVYUH · इन्द्रव्यूह

**Where Chaos Meets Coordination.**  
A full-stack, bilingual flood-preparedness and response-coordination prototype centred on **Supaul district, Bihar, India**.

> **Demonstration status:** The default deployment uses fictional, clearly labelled simulated records. It is not connected to emergency services, does not monitor SOS requests, and does not verify real shelters or response teams. Follow authorised local instructions for immediate danger.

## What is included

### Public experience

- Responsive ocean/glass interface using the supplied INDRAVYUH logo, with persisted dark and light modes and English / हिन्दी selection. A layered **3D Supaul response diorama**, translucent six-face cube and depth-enhanced actions respond to pointer/scroll parallax; animated counters and scroll progress respect reduced-motion preferences, while coarse-pointer devices receive static geometry.
- **One-press GPS SOS** with no emergency form. A press obtains the current in-district position, stores it in the restricted Chief Administration queue, and returns a unique serial, private tracking code and origin coordinates.
- Citizen incident reports with optional identity/contact, affected/trapped/vulnerable people counts, coordinates and a private JPEG/PNG/WebP attachment (5 MB limit). Citizens never enter operational water, weather, flow, rise-rate or access-risk measurements.
- Reference + private access-code tracking for reports and SOS response stages.
- Supaul-bounded interactive and schematic maps. The default bundled local-vector basemap makes no tile, Google or other external map request.
- District boundary, 12 locality labels and four landmark references: Supaul College of Engineering, Sadar Hospital, Supaul Railway Station and Nirmali Railway Station.
- Operationally specific published alerts with affected area, optional landmark and route condition, including water reaching Supaul College of Engineering and all routes blocked in Raghopur.
- Shelter listings, concise preparedness actions, privacy information and mobile emergency actions.
- Privacy-protected family check-in creation and two-code status lookup. Public lookup never returns the restricted contact field.
- One homepage-only environment notice; public pages stay concise and action-oriented.

### Chief Administration Portal

- Actual-dataset operational counters, district command metrics and a unified detect → verify → prioritise → rescue → relieve → recover board.
- Restricted incident/SOS map with precise points, shelters and optional team fixtures.
- **Chief Administration measured field-report submission**, including location, water level, flow velocity, rainfall, rise rate, affected/trapped/vulnerable people, access condition, notes and optional coordinates.
- Report review, verification, priority, assignment, resolution, complete event history and administrative audit log.
- Active SOS queue with acknowledgement, responding and resolved stages plus a preserved response timeline.
- Deterministic landmark/area risk ranking, selectable field reports, component-level score explanations and missing-data confidence labels.
- Rescue-team status, shelter capacity/status updates and privacy-protected family check-in operations.
- Relief inventory, depot/shortage summaries, priority-zone allocation, delivery creation and in-transit/delivered tracking with stock controls.
- Bilingual advisory drafting with structured area, landmark and route status; administrator-only publication.
- Response notices, current assignments, descriptive analytics and administrator-only authenticated CSV export.
- Shared organisation-support requests and typed Specialized Action assignments for citizen verification, monitoring, communication, relief supply, tracking and internal notification. Outcomes return to Chief Administration without exposing citizen contact details, precise coordinates, attachments or tracking hashes.

### Business portal

- Visually distinct organisation workspace with no Chief Administration navigation or data access.
- Organisation profile and member administration with server-enforced tenant scoping.
- Products/services, invoices, setup tasks, support tickets and service analytics.
- Tenant-scoped Chief Administration coordination requests with status updates and organisation-scoped audit history.

### Specialized Action Portal

- Live typed queue with 20-second refresh, type filters and own-assignment permissions for citizen verification, monitoring, communication, relief supply, tracking, notification and extensible general coordination.
- Officers can start work and submit required completion notes. Citizen verification additionally requires **Verified** or **Needs follow-up** and updates the linked Chief Administration report/event history.
- Relief completion transactionally marks the assigned in-transit delivery Delivered without allocating stock twice. Notification completion creates an internal notice. Completed actions lock against duplicate updates.
- Chief-visible outcome feed, internal action guides, notices, leave requests, profile and own activity history. Citizen contact, exact coordinates, attachments and tracking hashes remain excluded.

## FloodShield superset

The user’s FloodShield project was reviewed at commit `5cb569b522c389fc327004eb6b0ec6998a74033a`. Its public SOS/report/tracking, alert, shelter, family-safety, risk, response, logistics, command and analytics workflows are implemented in this full-stack architecture rather than by copying its static bundle. Existing server-side authentication, RBAC, tenant isolation, private tracking, audit history and precise-location restrictions remain in force. See `FLOODSHIELD_INTEGRATION.md` for the feature map.

## Technology

| Layer | Implementation |
|---|---|
| Frontend | React 19, React Router, Vite, custom responsive ocean/glass CSS |
| Maps | Leaflet + bundled Supaul vectors by default; optional OpenStreetMap tiles or Google Maps JavaScript API |
| Backend | Node.js 20, Express 5 |
| Database | SQLite via better-sqlite3, WAL mode, foreign keys and transactional report/SOS writes |
| Authentication | bcrypt password hashes, opaque random sessions and SHA-256 session-token hashes in DB |
| Session cookie | HttpOnly, configurable SameSite=Strict/Lax/None and Secure, 8-hour default expiry; Secure is forced for None |
| Preview resilience | Optional CHIPS cookie, dual-storage Bearer/secondary-header fallback and in-memory current-page credential when Web Storage is blocked; production example disables preview fallback |
| Security | Server-side RBAC, organisation scoping, Helmet CSP, origin checks, rate limits and Zod validation |
| Fonts | Self-hosted Inter and Noto Sans Devanagari |
| Deployment | Production Node server, compiled `dist/`, Dockerfile and Docker Compose |

## Quick start · development

Requirements: **Node.js 20.19 or newer** and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the API on port 3001.

The first start creates `data/indravyuh.sqlite` and fictional demo fixtures. `data/` is excluded from source archives and version control.

## Run the production build locally

The download contains `dist/`; rebuild after changing frontend configuration:

```bash
npm ci
cp .env.production.example .env
# Edit APP_ORIGIN, HTTPS/proxy settings and DEMO_MODE as appropriate.
npm run build
npm start
```

Open **http://localhost:3000** for local HTTP settings. Use HTTPS and `COOKIE_SECURE=true` for a public deployment.

To install only runtime dependencies when the compiled frontend is already present:

```bash
npm ci --omit=dev
npm start
```

## HTTPS reverse proxy and cross-site preview

Set `APP_ORIGIN` to the **current** public scheme and host, not an old sandbox or the container’s internal hostname. When one trusted reverse proxy terminates HTTPS, set `TRUST_PROXY=true`. Do not enable proxy trust on a directly exposed server. On Arena/E2B, if `APP_ORIGIN` is unset, the server derives `https://PORT-E2B_SANDBOX_ID.e2b.app` at startup, so a resumed sandbox cannot retain a retired preview origin. An explicit `APP_ORIGIN` always takes precedence for custom deployments.

For ordinary same-site HTTPS, keep `COOKIE_SAMESITE=strict` and set `COOKIE_SECURE=true`. A cross-site iframe preview may require:

```dotenv
APP_ORIGIN=https://your-current-preview-host.example
TRUST_PROXY=true
COOKIE_SECURE=true
COOKIE_SAMESITE=none
COOKIE_PARTITIONED=true
AUTH_BEARER_FALLBACK=true
```

`COOKIE_PARTITIONED=true` adds CHIPS `Partitioned` only with SameSite=None. With `AUTH_BEARER_FALLBACK=true`, login also returns the opaque session token. The client stores it in `localStorage` and `sessionStorage`, then sends both `Authorization: Bearer …` and `X-INDRAVYUH-Session: …` on API/file requests. This preserves sessions across reloads and same-context tabs when preview cookies are unavailable. If an embedded browser blocks either storage API—or both storage getters throw—the client guards access and retains an **in-memory credential for the current page**, so login and private navigation still work. A current-page credential cannot survive a full reload when both cookies and storage are unavailable. A valid cookie takes precedence over a stale browser token; private-session 401 responses retry once with the cookie. Late responses cannot erase a newer login.

Enable the fallback only for a trusted preview: browser-script token storage has a different XSS exposure from HttpOnly-only sessions. Keep it and CHIPS off for ordinary production unless the hosting model requires them. Restart Node after changing server-side origin/cookie/proxy settings; frontend map settings require a rebuild.

## Demo access

All demo accounts use password **`Supaul@2026`**.

| Portal | Entry route | ID |
|---|---|---|
| Chief Administrator | `/portals/welfare` | `WELFARE-DEMO` |
| Chief Operations Operator (limited admin rights) | `/portals/welfare` | `OPERATOR-DEMO` |
| Business administrator | `/portals/business` | `BUSINESS-DEMO` |
| Specialized Action Officer | `/portals/employee` | `EMPLOYEE-DEMO` |

Sample private report tracking:

- **Reference:** `IV-SUP-DEMO01`
- **Access code:** `DEMO-TRACK-26`

Sample family lookup:

- **Reference:** `IV-SUP-FAM-DEMO01`
- **Access code:** `DEMO-FAMILY-26`

Demo users are deactivated at startup when `DEMO_MODE=false`. Do not expose these credentials on a public deployment.

## Supaul map configuration

The default `local` provider needs no API key and makes no external basemap/tile requests. It bundles OSM relation **1568264**, simplified for visualisation, plus 12 locality and four landmark coordinate references. Records, district mask, scale and labels remain usable without external map services. This is not a road/routing map and does not make the whole application offline-capable.

```dotenv
VITE_MAP_PROVIDER=local   # default; bundled vectors only
# VITE_MAP_PROVIDER=osm   # optional OpenStreetMap raster tiles
# VITE_MAP_PROVIDER=google
# VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
```

For Google, set both Google lines and rebuild. Restrict the browser key by HTTP referrer and Maps JavaScript API. Google script/network failure falls back to the local map. Map navigation remains limited to Supaul.

Boundary/locality notice: **© OpenStreetMap contributors, ODbL 1.0**. See `NOTICE.md` for sources and limitations. Koshi Barrage is not presented as an in-district landmark.

## Environment variables

| Variable | Purpose | Safe local default |
|---|---|---|
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | API/production HTTP port | `3001` dev; `3000` production |
| `APP_ORIGIN` | Current allowed public browser origin | `http://localhost:5173` dev |
| `DATA_DIR` | SQLite and private upload directory | `./data` |
| `DEMO_MODE` | Seeds/isolates simulated data and displays demo status | `true` |
| `COOKIE_SECURE` | Adds Secure; required with HTTPS | `false` locally |
| `COOKIE_SAMESITE` | `strict`, `lax` or `none`; None forces Secure | `strict` |
| `COOKIE_PARTITIONED` | Add CHIPS Partitioned with SameSite=None | `false` |
| `AUTH_BEARER_FALLBACK` | Preview token response and header-based sessions | `false` |
| `TRUST_PROXY` | Trust one reverse proxy | `false` locally |
| `SESSION_HOURS` | Session lifetime, constrained to 1–24 hours | `8` |
| `VITE_MAP_PROVIDER` | `local`, `osm` or `google` | `local` |
| `VITE_GOOGLE_MAPS_API_KEY` | Restricted Google browser key | unset |

Do not commit `.env` or `data/`.

## Docker deployment

```bash
docker compose up --build
```

Compose is an **evaluation configuration** on port 3000 with demo mode enabled. Named volume `indravyuh-data` persists SQLite and private uploads. Put it behind HTTPS and adjust origin/cookie/proxy/demo settings. Container build/startup is documented but was not executed in the delivered QA environment.

## Create non-demo users and organisations

On a fresh non-demo data directory:

```bash
DEMO_MODE=false npm run create-user -- welfare ADMIN-ID "Administrator Name" "a-long-unique-password"
DEMO_MODE=false npm run create-user -- employee STAFF-ID "Staff Name" "a-long-unique-password"
```

For a business administrator:

```bash
DEMO_MODE=false npm run create-organisation -- "Organisation Name" "admin@example.org" "Coordination Pilot" "Supaul, Bihar"
DEMO_MODE=false npm run create-user -- business ORG-ADMIN-ID "Organisation Admin" "a-long-unique-password" RETURNED_ORG_ID
```

CLI-created administrator passwords require at least 12 characters. Use secure secret sharing and rotation; command-line secrets may be retained in shell history.

## Tests and verification

```bash
npm test                 # 37 API/workflow/proxy/privacy/RBAC/origin tests in 11 suites
npm run build            # Production frontend compilation
npm audit --omit=dev     # Production dependency audit
```

Browser checks require the demo production server on port 3000 (or set `BASE_URL`):

```bash
npx playwright install chromium
# Linux CI may also need: npx playwright install-deps chromium
npm run test:browser     # 41 focused public/portal/3D/blocked-storage/mobile checks
npm run test:audit       # 236 end-to-end checks across every route and upgraded workflow
```

The full audit submits SOS/report/family/coordination/delivery records. After each portal login it calls Playwright `clearCookies()`, reloads the dashboard and proves private access with persistent header credentials. It also tests stale-token cookie recovery, genuine expired-session redirect, cross-tab logout, SOS GPS origin/serial, separate citizen/Chief reports, measured risk scoring, response transitions, named-area alerts, family privacy, relief deliveries and Specialized Action verification outcomes. Use a fresh demo `DATA_DIR` afterwards when clean fixtures are required.

The focused smoke suite also forces both Web Storage getters to throw, signs in all four demo accounts and opens a private module with each in-memory session. It verifies visible 3D geometry, pointer and scroll parallax, static reduced-motion/coarse-pointer behavior, and mobile overflow.

Both browser suites record console/runtime failures. Screenshots and machine-readable results go to `qa-screenshots/`, excluded from production archives. See `QA_REPORT.md` for final results.

## Project structure

```text
indravyuh/
├── dist/                      # Compiled production frontend (included)
├── public/assets/             # Supplied logo and static brand assets
├── scripts/                   # Admin CLIs, browser smoke and full audit
├── server/                    # Express app, DB, auth, RBAC and API routes
├── src/
│   ├── components/            # Public, map, SOS and operational components
│   ├── context/               # Auth, language, SOS and persisted theme state
│   ├── data/                  # Supaul boundary, localities and landmarks
│   ├── pages/                 # Public and portal pages
│   └── styles.css / workspaces.css / ocean.css / superset.css / dynamic.css
├── tests/                     # Isolated API/security/workflow integration tests
├── .env.example / .env.production.example
├── Dockerfile / docker-compose.yml
├── API.md / FLOODSHIELD_INTEGRATION.md / QA_REPORT.md
└── PRODUCTION_CHECKLIST.md
```

## Important operational limitations

- `DEMO_MODE=false` is a configuration state, **not proof of operational readiness**.
- Real alert publication needs an authorised human process and verified sources.
- SOS monitoring, escalation, staffing, external notification delivery and service hours must be separately implemented and tested before live claims.
- Risk scores are deterministic triage from submitted measurements, not live forecasts. Missing groups add no invented points and lower confidence.
- Add malware scanning, retention/deletion jobs, backups, central logs, monitoring and identity/password recovery before real personal data.
- SQLite suits a controlled prototype or small single-instance pilot. Evaluate managed storage, migrations and backups before multi-instance deployment.
- Preparedness text is general information and should be reviewed against current official local guidance.

Read `PRODUCTION_CHECKLIST.md` before any real-world pilot.
