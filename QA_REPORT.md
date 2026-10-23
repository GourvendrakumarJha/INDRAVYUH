# INDRAVYUH · Revised production QA report

**Validation date:** 23 October 2026  
**Target:** Supaul, Bihar · production Node server + compiled React frontend  
**Mode evaluated:** Clean demo fixtures, local-vector map, exact HTTPS reverse-proxy/cross-site-preview configuration

## Final results

| Check | Result |
|---|---|
| Production frontend build | **PASS · 1,692 modules** |
| Production dependency audit (`npm audit --omit=dev`) | **PASS · 0 vulnerabilities** |
| API/database/FloodShield/coordination/proxy/map/security/interface tests | **37 / 37 PASS · 11 suites** |
| Full Chromium public-route and portal-module audit | **236 / 236 PASS** |
| Focused Chromium production smoke suite on reseeded preview fixtures | **41 / 41 PASS** |
| Private full-audit API calls carrying Bearer + secondary preview credentials | **89 / 89** |
| Portal login + reload after actual browser-context cookie clearing | **4 / 4 PASS** |
| All four demo logins + private modules with both Web Storage APIs blocked | **4 / 4 PASS** |
| Unexpected HTTP 4xx/5xx responses in final full audit | **0** |
| Browser console/runtime errors in final full audit and clean smoke | **0** |
| External tile/Google requests with default local map | **0** |
| Localities and landmarks validated inside Supaul | **12 localities + 4 landmarks** |
| Desktop/mobile horizontal-overflow checks | **PASS** |

After the full audit, the running preview was reseeded with clean fixtures and passed the 41-check smoke suite. Only read/login checks followed, so audit submissions, alerts and assignments are not present in the preview data. Screenshots and machine-readable results are in `qa-screenshots/` during development; that directory and runtime `data/` are excluded from production archives.

## Citizen, Chief Administration and SOS boundaries

- The citizen incident form contains optional identity/contact, observation details, human-impact counts, GPS/photo and consent. It has no water-level, flow-velocity, rainfall, rise-rate or operational access/risk inputs.
- The public schema does not persist attempted operational measurement values. Citizen risk fields remain null while affected/trapped/vulnerable counts are retained. Public citizen counters exclude measured Chief records.
- The citizen incident route rejects a form-based SOS flag. SOS is created only by the separate one-press GPS workflow.
- Chief Administration alone submits measured field reports. The authenticated form exposes all six operational input groups plus human-impact details and retains the documented deterministic risk method.
- Browser checks confirmed the citizen form has no operational inputs and the Chief measured form has all six, with an explicit accessible name on the access-condition control.
- One-press SOS retained its unique serial, exact restricted origin, accuracy and capture time; public tracking remains status-only and SOS stays off public layers.

## Specialized Action online operations

- The renamed Specialized Action Portal presents a typed live queue for citizen verification, monitoring, communication, relief supply, tracking, notification and general coordination, with 20-second refresh and type filters.
- Chief Administration can assign each specialized type. Officers can start assignments and submit required completion notes; completed actions reject duplicate updates.
- Citizen verification requires **Verified** or **Needs follow-up**. API and browser tests proved the outcome returns to Chief Administration, updates the linked report and appends its event history.
- Verification assignment is restricted to non-SOS citizen incident reports. Measured Chief reports and SOS cannot be mislabeled as citizen-verification targets.
- Relief completion requires an in-transit linked delivery, marks it Delivered transactionally and does not allocate stock a second time. A visual-review regression also ensures non-relief tasks cannot retain an unrelated delivery link.
- Notification completion creates an internal notice. Monitoring, communication and tracking completion results appear in both the officer queue and Chief feedback feed.
- Specialized responses exclude citizen contact, exact coordinates, attachments and tracking hashes; own-task and cross-portal server checks remain green.

## Authentication and deployed-preview configuration

- The running preview uses its exact current HTTPS sandbox origin, one trusted proxy, secure SameSite=None CHIPS cookies and the explicitly enabled preview Bearer/secondary-header fallback. The preview origin is derived from the current sandbox ID at startup when no explicit origin is supplied, with a regression test for resumed sandbox IDs and custom-production overrides.
- Forwarded-host/protocol/origin verification returned login **200**, secure `HttpOnly; Secure; SameSite=None; Partitioned` cookie attributes, Bearer overview **200**, secondary-header overview **200**, stale-Bearer/valid-cookie recovery **200**, and hostile Origin **403**. After the sandbox resume fix, all four demo IDs again returned login **200** and private overview **200** on the current host; the retired origin returned **403**.
- The full audit uses Playwright `context.clearCookies()` after portal logins, reloads each dashboard and exercises private routes without browser cookies. Four cookie-clear login/reload cycles passed.
- The focused suite also made both `localStorage` and `sessionStorage` getters throw `SecurityError`. All four demo IDs signed in and opened a private module using the in-memory credential, with no runtime/console errors. Login IDs accept case variations while passwords remain exact bcrypt comparisons.
- A valid cookie takes precedence over a stale browser token. A genuinely expired cookieless session returns to sign-in without a generic error panel. Late responses cannot erase a newer login. If cookies and both storage APIs are all unavailable, the in-memory session is intentionally limited to the current page.
- Ordinary same-site production retains HttpOnly SameSite=Strict sessions with preview fallback disabled by default.

The hosting platform’s traffic-token edge is separate from the application. Direct external requests without that platform token can be rejected before Node; application behaviour for the exact public origin was therefore verified through forwarded-proxy requests and Chromium against the same production configuration used by the preview.

## FloodShield and operational workflows

- The documented measured sample produced **79/100 Critical** with six score components and Complete confidence. Missing groups do not invent points and produce Partial confidence where applicable.
- SOS acknowledgement, team dispatch, responding and resolution passed in order; skipped/repeated transitions return 409 and the event timeline is retained.
- Named-area/landmark alerts and route conditions passed draft, administrator publication and public rendering checks.
- Family check-in creation and private two-code lookup passed; public results omit restricted contact. Chief family operations remain protected.
- Relief allocation reduced stock transactionally; delivery state controls, overspending rejection and exactly-once cancellation restocking passed.
- District command, response board, shelter/team operations, analytics, authenticated CSV export and organisation-scoped coordination passed.
- `FLOODSHIELD_INTEGRATION.md` records the corrected feature mapping. The implementation uses server-side authentication and permissions rather than FloodShield’s static client-side role model.

## Design, motion, content and maps

- Ocean/water glassmorphism, supplied INDRAVYUH branding, dark/light modes and English/Hindi selection persist across the experience.
- The concise homepage now includes direct SOS and citizen-report actions, animated public counters, seven quick actions and two current updates. Its single notice remains: **“DEMO — Simulated data; not connected to emergency services.”**
- A visible layered **3D Supaul district diorama**, translucent six-face response cube, floating network/signal cards and depth-enhanced quick-action icons render in dark and light modes. Chromium verified all six cube faces plus measurable pointer-driven and scroll-driven 3D transform changes.
- Decorative multi-layer parallax and scroll progress respond to a passive, animation-frame-throttled scroll listener. Text and controls do not move away from the reader; the 3D implementation uses CSS geometry without adding a WebGL dependency.
- Reduced-motion Chromium checks confirmed zero 3D scroll-parallax variables and no cube/ring animation while retaining static 3D geometry. Coarse-pointer mobile checks confirmed static parallax, a visible scene and no horizontal overflow.
- Visible portal names are **Chief Administration Portal** and **Specialized Action Portal**. Retired emergency-phone content and unrelated instructional material are absent; the Hindi interface remains available.
- Supaul College of Engineering, Sadar Hospital, Supaul Railway Station and Nirmali Railway Station render in interactive/schematic views. All 12 localities and four landmarks passed district-polygon validation.
- Default maps made zero external requests. Koshi Barrage is not presented as an in-district landmark.

## Privacy, RBAC and tenant isolation

- Wrong-password/wrong-portal rejection, cross-portal denial, administrator-only audit/export and private photo controls remain green.
- Public incidents include only verified, explicitly public, non-SOS records with reduced coordinates.
- Chief Administration → Business requests are visible only to the selected organisation; cross-organisation reads/updates are denied.
- Specialized Action users can update only their own assignments. General legacy tasks remain compatible while specialized tasks require outcomes.
- Family public lookup requires both codes and never returns the restricted contact field.

## Scope and remaining operational work

This is build and workflow verification, not certification of WCAG compliance, operational emergency readiness, legal compliance, real-data accuracy, load capacity, malware scanning or independent penetration testing. Docker build/startup was not executed in this QA environment. A real restricted Google key was not tested.

Before a real-world pilot, complete `PRODUCTION_CHECKLIST.md`, disable demo accounts and preview token fallback, establish authorised monitoring/escalation and external notification delivery, verify operational data, and review privacy, retention, backups, uploads, accessibility and incident-response controls.
