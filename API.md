# INDRAVYUH API overview

Same-origin JSON API except citizen photo upload, which uses multipart form data. Private routes normally require the `iv_session` HttpOnly cookie. A trusted preview may explicitly enable `AUTH_BEARER_FALLBACK`, allowing the same opaque session through `Authorization: Bearer …` or `X-INDRAVYUH-Session: …`. A valid cookie takes precedence over an invalid browser token. Every private router checks portal/role on the server; organisation and ownership filters are applied in SQL.

## Public

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Service/demo health |
| GET | `/api/public/bootstrap` | District, aggregate counters, public alerts, shelters and reduced public incidents |
| GET | `/api/public/alerts` | Published alerts with area, landmark and route condition |
| GET | `/api/public/shelters` | Public shelter records and freshness |
| GET | `/api/public/map-data` | Public map layers and Supaul bounds |
| POST | `/api/public/sos` | One-press GPS SOS; JSON latitude/longitude, optional accuracy/capture time |
| POST | `/api/public/reports` | Validated citizen incident report; multipart photo optional; never a form-based SOS path |
| GET | `/api/public/track?reference=…&accessCode=…` | Two-code private report/SOS status and response stage |
| POST | `/api/public/family-checkins` | Consent-based family check-in; returns reference and private code |
| GET | `/api/public/family-safety?reference=…&accessCode=…` | Two-code family status lookup without restricted contact |

SOS requires a current position inside Supaul. It returns `reference`, `accessCode`, origin `coordinates` and `capturedAt` only after transactional insertion. Public tracking returns status information, not exact coordinates or contact details.

Citizen report submission returns a reference and access code only after database insertion. Its schema has no operational water/weather/flow/rise/access-risk inputs; unknown measurement values are not stored, risk remains null, and `isSos: true` is rejected. Human-impact counts and optional reporter identity/contact are retained. Public citizen counters include only `source=Citizen` records. SOS and unverified reports cannot be published to public map layers. Public incident coordinates are reduced and only verified, explicitly public, non-SOS records are eligible.

Family creation requires `name`, `status` (`Safe`, `At shelter`, `Need assistance`), `area`, `consent: true`, and optional `shelterId`, `note` and `contact`. Public lookup intentionally omits `contact`; authorised Chief Administration personnel can access the restricted operations record.

## Authentication

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Portal-specific ID/password login |
| POST | `/api/auth/logout` | Delete current opaque session |
| GET | `/api/auth/me` | Current safe user and demo state; no user returns `user: null` |

With preview fallback enabled, login also returns `sessionToken`. The client keeps it in local/session storage and sends both supported headers on API and authenticated file requests. A private-session 401 can retry once against the cookie; stale tokens are removed without allowing an older response to overwrite a newer login.

## Chief Administration (internal `welfare` portal key only)

### Reports, SOS and map

- `GET /api/welfare/overview`
- `GET /api/welfare/reports?type=sos|reports&status=…&search=…`
- `POST /api/welfare/reports` — authorised Chief Administration measured field-report submission with measurements and people/access details
- `GET/PATCH /api/welfare/reports/:id`
- `GET /api/welfare/reports/:id/photo`
- `POST /api/welfare/reports/:id/response` — SOS-only ordered response transition

SOS response stages are strictly:

`Received → Acknowledged → Dispatched → Responding → Resolved`

Dispatch requires a valid response team. Each transition updates status, appends an event and writes an audit record; skipped or repeated stages return 409.

### Risk, command and coordination

- `GET /api/welfare/risk-analytics` — ranked field reports, score components, confidence and method
- `GET /api/welfare/command` — district metrics, active dispatch and recent response notices
- `GET /api/welfare/coordination` — safe organisation/employee directories and shared work
- `POST /api/welfare/coordination/requests` — tenant-scoped organisation request
- `POST /api/welfare/coordination/tasks` — typed Specialized Action assignment with optional report/delivery links

Risk scores use only supplied groups. Water level contributes up to 30, velocity 20, one-hour rainfall 15, rise rate 15, people/vulnerability 15 and access 5. Missing groups add no invented points; incomplete input is labelled Partial. This is deterministic triage, not a live forecast.

### Teams, shelters and family safety

- `GET /api/welfare/teams`
- `PATCH /api/welfare/teams/:id`
- `GET /api/welfare/shelters`
- `PATCH /api/welfare/shelters/:id`
- `GET /api/welfare/family-safety` — restricted operations list
- `PATCH /api/welfare/family-safety/:id` — status/area/shelter/note update with audit

### Relief and logistics

- `GET /api/welfare/relief`
- `PATCH /api/welfare/relief/:id`
- `GET /api/welfare/logistics` — inventory, depots, shortages, deliveries and metrics
- `POST /api/welfare/logistics/deliveries` — transactionally allocate available stock
- `PATCH /api/welfare/logistics/deliveries/:id` — In transit → Delivered or Cancelled

Overspending stock is rejected. Cancelling an in-transit delivery restores its allocation once. Terminal deliveries cannot be moved backward or cancelled again.

### Alerts, analytics and audit

- `GET/POST /api/welfare/alerts` — draft with bilingual content, area, landmark and route condition
- `PATCH /api/welfare/alerts/:id/publish` — Chief Administrator
- `GET /api/welfare/analytics`
- `GET /api/welfare/export/reports.csv` — Chief Administrator; authenticated download
- `GET /api/welfare/audit` — Chief Administrator

## Business (`business` portal + caller’s organisation)

- `GET /api/business/overview`
- `GET/PATCH /api/business/organisation`
- `GET/POST /api/business/members`
- `PATCH /api/business/members/:id`
- `GET /api/business/invoices`
- `GET /api/business/coordination` — only the caller organisation’s shared requests
- `PATCH /api/business/coordination/:id` — tenant-scoped status update
- `GET /api/business/implementation`
- `PATCH /api/business/implementation/:id`
- `GET/POST /api/business/tickets`
- `PATCH /api/business/tickets/:id`
- `GET /api/business/analytics`
- `GET /api/business/audit` — business administrator

Organisation profile/member administration requires a business administrator where appropriate. Every record query includes the authenticated organisation ID.

## Specialized Action (internal `employee` portal key only)

- `GET /api/employee/overview`
- `GET /api/employee/tasks`
- `PATCH /api/employee/tasks/:id` — own task status/outcome only
- `GET /api/employee/notices`
- `GET/POST /api/employee/leave`
- `PATCH /api/employee/leave/:id` — employee administrator
- `GET /api/employee/profile`

Task types are `general`, `citizen_verification`, `monitoring`, `communication`, `relief_supply`, `tracking` and `notification`. Specialized completion requires a factual result note. Citizen verification also requires `Verified` or `Needs follow-up`, updates the linked report and appends an event; only non-SOS citizen incident reports are eligible. Relief completion requires an in-transit linked delivery and marks it Delivered transactionally. Notification completion inserts an internal notice. Completed tasks return 409 on duplicate updates.

Assignments include only the references/instructions and type-specific evidence required for the task—not citizen contact details, precise coordinates, attachments or tracking hashes. A delivery link is rejected for every non-relief type. Chief Administration coordination/overview responses expose the resulting status, note, outcome and linked record.

## Error model

Errors use an HTTP status and JSON such as:

```json
{ "error": "Access not authorised for this workspace", "code": "ACCESS_DENIED" }
```

Validation errors may include field paths. A 404 is used for several missing-or-not-authorised record lookups to avoid exposing sensitive records. Ordered workflow conflicts use 409.
