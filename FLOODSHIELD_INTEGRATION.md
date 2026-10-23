# FloodShield functional integration

**Source reviewed:** the user’s `GourvendrakumarJha/FLOODSHIELD` repository.  
**Commit:** `5cb569b522c389fc327004eb6b0ec6998a74033a`  
**Integration approach:** functional superset in INDRAVYUH’s React/Express/SQLite architecture, not a copy of FloodShield’s compiled static bundle or client-side role storage.

## Coverage map

| FloodShield capability | INDRAVYUH implementation |
|---|---|
| Public emergency SOS | One-press GPS SOS on homepage, Help and mobile action; unique serial, private code and retained origin coordinates |
| Citizen incident reporting | Citizen-only incident composer with optional identity/contact, type, description, location/coordinates, human-impact counts and private photo; operational measurements are excluded |
| Report reference and tracking | Existing two-code tracking extended with SOS response stage |
| Shelter finder | Public shelter list and Supaul map layer; Chief Administration capacity/status operations |
| Family reference lookup | New consent-based check-in plus two-code public status lookup; restricted contact never returned publicly |
| Emergency alerts | Existing bilingual alerts extended with named area, landmark and route condition |
| Concrete safety instructions | Published alert bodies and operational route guidance; examples include Supaul College of Engineering and Raghopur |
| Public response counters | Homepage current record counts and two latest published updates |
| Landmark map preview | Supaul-bounded interactive/schematic maps with locality and landmark layers |
| Overview / district command | Chief Administration command metrics, response chain, active dispatch and situation notices |
| Landmark priority ranking | Risk-ranked field reports with selectable locations and score bands |
| Water/velocity/rainfall/access observations | Chief Administration-only measured field-report schema, detail display and risk components; never citizen inputs |
| Risk score contributions | Six component cards with points, weight, threshold and actual input |
| Missing-data confidence | Complete/Partial/Unavailable confidence; missing groups do not invent points |
| New field-report action | Authenticated Chief Administration measured field-report composer linked from reports and risk views |
| Active SOS queue | Restricted queue with incident detail and event history |
| Acknowledge and response stages | Ordered Received → Acknowledged → Dispatched → Responding → Resolved workflow |
| Response timeline | Existing report events plus response-stage/team/people-assisted records |
| Field-report risk/recency ordering | Risk analytics and report filters backed by SQL queries |
| Needs review / verified / dispatched / resolved views | Existing verification/status/priority filters and operational queues |
| Response board | Chief Administration command board with dispatch lane, response notices and linked workspaces |
| Rescue operations | Team status, assignment and SOS dispatch integration |
| Relief inventory | Existing stock controls plus depot, shortage and readiness metrics |
| Alert broadcast | Bilingual draft/publish workflow with administrator-only release |
| Distribution requests and shortages | Delivery records, stock minima and shortage counts |
| Delivery creation and transit tracking | Transactional stock allocation and one-way Delivered/Cancelled updates |
| People reached and assistance metrics | Delivery and SOS assistance fields included in district command |
| Analytics thresholds and ranking | Shared deterministic `server/risk.js` method returned by the API and displayed in the UI |
| Specialized online operations | Typed queue for monitoring, communication, relief supply, citizen verification, tracking, internal notification and extensible general assignments |
| Executable assignment outcomes | Required completion notes, Verified/Needs follow-up verification, transactional relief completion, internal notices and duplicate-completion locks |
| Chief feedback loop | Specialized outcomes and linked report/delivery states returned to Chief Administration overview and coordination feeds |
| Portal login | Retained and strengthened with real ID/password, opaque server sessions, RBAC and cookie/header preview resilience |

## Deliberate security improvements over the reference

- No role is trusted from browser storage. Portal, administrator, organisation and ownership checks run on the server.
- SOS and report inserts use transactional persistence and return credentials only after success.
- Exact SOS/report coordinates, contact fields, attachments and tracking hashes remain restricted to authorised workflows.
- Public family lookup requires both reference and private code and omits the contact field.
- Business coordination remains isolated to the caller’s organisation; Specialized Action tasks remain limited to their owner.
- Alert publication, CSV export and audit history retain administrator checks.
- FloodShield’s demonstration credentials are not reused as an authentication mechanism.

## Report-path boundary

Citizen submissions and measured Chief Administration field reports use separate schemas and routes. Citizens can describe human impact but cannot supply water level, flow velocity, rainfall, rise rate or operational access/risk measurements. SOS is accepted only through the one-press GPS endpoint, not the citizen incident form.

## Risk method

| Component | Maximum points | Threshold used for scaling |
|---|---:|---:|
| Water level | 30 | 180 cm |
| Flow velocity | 20 | 2.5 m/s |
| One-hour rainfall | 15 | 75 mm |
| Rise rate | 15 | 20 cm/hr |
| People and vulnerability | 15 | 100 impact points |
| Access disruption | 5 | Blocked |

People impact = `affected × 0.5 + trapped × 2 + vulnerable`. Component points are capped and rounded. Bands are Critical ≥75, High ≥55, Moderate ≥30 and Low below 30. No supplied groups means no score; partial input is labelled accordingly.
