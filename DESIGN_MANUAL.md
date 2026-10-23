# INDRAVYUH --- UI/UX & Visual Design Manual

**Product:** Indravyuh (इन्द्रव्यूह)\
**Positioning:** Social-impact disaster-intelligence and flood-response
coordination platform\
**Primary context:** Supaul, Bihar, India\
**Interface languages:** English and Hindi (हिन्दी)\
**Document status:** Original design specification for implementation; not a
claim that these screens already exist.

**Implemented revision · 23 October 2026:** The delivered application uses ocean/glass design, persisted dark/light modes, reduced-motion-aware parallax and animated public counters, one-press GPS SOS, separate citizen incidents and Chief Administration measured field reports, staged SOS response, structured alerts, family safety, relief deliveries and typed Specialized Action assignments with outcomes returned to Chief Administration. The demo/simulated/not-connected notice appears once on the homepage. Where earlier suggestions conflict with this revision, the current README, source and QA report take precedence.

------------------------------------------------------------------------

## 1. Product experience principles

1.  **One public front door:** Visitors should find reporting, help
    information, maps, alerts, shelters, preparedness, and report
    tracking from the public homepage.
2.  **Four distinct experiences:** Public, Chief Administration,
    Business, and Specialized Action. Each has its own information architecture and layout.
3.  **Strict separation:** Business users must not be able to enter
    Chief Administration operations merely by changing a URL. Chief Administration users must not
    automatically see commercial billing or customer-account data.
    Enforce this on the server and API, not just in the UI.
4.  **Calm under pressure:** Emergency-oriented screens must prioritise
    clarity, legibility, and predictable interactions over visual
    spectacle.
5.  **Bilingual from the start:** English and Hindi must both be
    first-class interfaces, not an afterthought.
6.  **Honest status:** Simulated, unverified, verified, official, stale,
    and unavailable information must be visibly distinct.
7.  **Motion with purpose:** Parallax belongs primarily on the public
    landing page. Operations screens should remain stable and quick to
    use.

## 2. Brand and visual language

### Brand name

**INDRAVYUH --- इन्द्रव्यूह**

Suggested brand line: **Where Chaos Meets Coordination.**

Suggested product descriptor: *Flood Preparedness & Response
Coordination.*

### Mood

-   Indian in its cultural roots, contemporary in execution.
-   Strategic, resilient, and trustworthy.
-   Inspired by river channels, monsoon clouds, topographic contours,
    and geometric formations.
-   Avoid overly ornate mythological imagery, cluttered dashboard
    decoration, or visuals that make the platform look like a game.

### Colour tokens

Use these as initial design tokens and verify all text/background
combinations for WCAG contrast.

  -----------------------------------------------------------------------
  Token                   Suggested value         Use
  ----------------------- ----------------------- -----------------------
  Midnight Navy           `#071426`               Main background,
                                                  footer, dark hero

  Deep Navy               `#0B1F35`               Navigation, dark panels

  River Teal              `#0F766E`               Primary brand accent

  Electric Cyan           `#22D3EE`               Highlights, active map
                                                  layers, decorative
                                                  glows

  Ice Blue                `#E0F2FE`               Light surfaces and
                                                  information panels

  Mist                    `#F4F8FB`               Light page background

  Slate                   `#475569`               Secondary text on light
                                                  backgrounds

  Amber                   `#F59E0B`               Warnings and pending
                                                  review

  Alert Red               `#DC2626`               Urgent hazard or SOS
                                                  emphasis

  Verified Green          `#15803D`               Verified/resolved
                                                  status only when
                                                  warranted

  White                   `#FFFFFF`               Main light surface and
                                                  high-contrast text
  -----------------------------------------------------------------------

Do not use colour as the only signal. Pair status colours with labels
and icons. Do not use "safe" green for unverified shelter or route
information.

### Typography

-   **Latin:** Inter or a similarly legible sans-serif.
-   **Devanagari:** Noto Sans Devanagari.
-   Define a complete fallback stack and test Hindi punctuation,
    conjuncts, numerals, and line wrapping.
-   Headings: strong, compact, and clear; body text: comfortable line
    height.
-   Avoid ultra-thin weights for maps, status labels, and emergency
    instructions.

### Shapes, texture, and iconography

-   Use geometric linework inspired by a *vyuh* formation and branching
    river channels.
-   Use restrained contour-line patterns, subtle grid lines, and
    water-like gradients.
-   Prefer consistent line icons for reports, alerts, maps, shelters,
    rescue teams, and supplies.
-   Use familiar labels alongside icons; never make icon-only navigation
    the sole way to identify a feature.
-   Use photographs of real communities only when properly licensed and
    contextualised. Do not imply that stock imagery shows actual
    incidents in Supaul.

## 3. Information architecture

### A. Public area

Routes are illustrative; adapt them to the framework already in the
repository.

-   `/` --- Public homepage
-   `/report` --- Submit a citizen report
-   `/help` --- Help/SOS information and any implemented request
    workflow
-   `/map` --- Public map
-   `/alerts` --- Public alerts and advisories
-   `/shelters` --- Verified shelter and relief information
-   `/preparedness` --- Guides and checklists
-   `/my-reports` --- Secure report status, if accounts or reference
    codes are implemented
-   `/about` --- Mission, limitations, transparency, and contact
    information

The public homepage must show all public options in a single,
easy-to-scan area. It must not be a gateway that exposes private Chief Administration
or business dashboards.

### B. Community & Chief Administration area

Illustrative route group: `/welfare/*`

-   Overview
-   Live operations map
-   SOS queue
-   Citizen reports
-   Incident verification and triage
-   Rescue teams and assignments
-   Shelters
-   Relief inventory and distribution
-   Alerts and advisories
-   Situation reports and analytics
-   User administration and audit history

Only authenticated and authorised Chief Administration roles should access these
routes and the corresponding APIs.

### C. Business area

Illustrative route group: `/business/*`

-   Business overview
-   Organisation profile
-   Team and role management
-   Products and services
-   Subscription and invoices
-   Implementation/onboarding
-   Service analytics
-   Support tickets and documentation
-   Account audit history

Business pages must not contain links to the Chief Administration command centre.
Business users must not receive Chief Administration API permissions by default.

### D. Authentication and access

-   Public pages should remain usable without sign-in where appropriate.
-   Ask users to sign in only when a feature requires identity or
    private status tracking.
-   Provide separate, clearly labelled entry points for authorised
    Chief Administration personnel and business customers.
-   After login, route users according to their authorised role and
    organisation.
-   If a user lacks permission, show a clear "Access not authorised"
    page with a safe way back. Do not reveal whether a sensitive record
    exists.
-   Test direct URL access and direct API requests. Hiding a navigation
    item is not sufficient access control.

## 4. Public homepage specification

### Purpose

A resident should understand what Indravyuh is and find the correct
public action within seconds, especially on a phone.

### Top navigation

**Left:** Indravyuh symbol and wordmark.\
**Centre/right:** Map, Alerts, Shelters & Relief, Preparedness, About.\
**Persistent controls:** `EN | हिन्दी`, accessibility-friendly menu, and
a clearly differentiated **Report an Incident** button.

On small screens, use a compact menu but keep the primary reporting
action visible. The language switch must remain easy to find.

Do not place business subscription links beside emergency actions. A
small, separate "For Organisations" link can lead to the business
information/entry page.

### Hero section

-   Full-width dark navy background.
-   Layered river/topographic graphics.
-   Large headline: **Where Chaos Meets Coordination.**
-   Supporting copy: "Local information. Clearer coordination. Stronger
    preparedness."
-   Primary CTA: **Report an Incident**
-   Secondary CTA: **Explore Flood & Safety Map**
-   A separate, visually prominent **Need Help?** option may be
    provided, but its behaviour must accurately reflect the service's
    real status.
-   Add a visible demo banner when data is simulated.

Do not claim "live flood detection," "official alerts," "rescue
dispatched," or similar capabilities unless they are genuinely
implemented and authorised.

### Public action grid

Immediately after the hero, show a card grid with these options:

1.  **Report an Incident** --- flooding, blocked road, infrastructure
    damage, or observed hazard.
2.  **Need Help? / SOS** --- show the actual available help workflow and
    its limitations.
3.  **Flood & Safety Map** --- approved public map layers.
4.  **Alerts & Advisories** --- dated notices with source attribution.
5.  **Shelters & Relief** --- authorised, verified information.
6.  **Preparedness Guides** --- checklists and local-language guidance.
7.  **Track My Report** --- reference-based or account-based status,
    only if implemented.
8.  **Family Check-in** --- planned feature; do not imply active
    monitoring unless implemented.
9.  **Community Resources** --- links and resources from verified
    partners.
10. **About & Transparency** --- what the platform does, data practices,
    limitations, and contact information.

Each card should have an icon, a short description, a visible text
label, and a clear interaction state. Do not rely on hover to reveal the
action.

### Latest information section

If genuine, authorised data is available, show:

-   Latest public advisories.
-   Publicly shareable verified incidents.
-   Last-updated time and source.
-   Map/data status.

If only demo data exists, label the section "Illustrative demo activity"
and use visibly simulated records. If data is unavailable or stale, say
so rather than displaying stale information as live.

### Preparedness section

Use a calmer light surface with three or four concise cards:

-   Before a flood
-   During flooding
-   After floodwaters recede
-   Family and document preparedness

Safety guidance must be reviewed against appropriate official sources
before publication.

### Impact and trust section

Explain the social-impact model and show only verified achievements.
During the prototype stage, use "Our intended impact" and "Pilot goals"
rather than invented outcome statistics.

### Footer

Include:

-   About Indravyuh
-   Privacy and data handling
-   Accessibility
-   Language switch
-   Contact / partnership enquiries
-   Demo disclaimer
-   Relevant official emergency resources, once verified for the target
    region

Keep emergency limitations visible; do not bury the demo disclaimer in
the footer alone.

## 5. Report submission UI

### Suggested form fields

Collect only what is needed:

-   Incident category
-   Description
-   Approximate location or map pin, with clear permission/consent
-   Time observed
-   Optional photo, with size/type limits and privacy guidance
-   Safe callback/contact field only if operationally needed
-   Consent and privacy explanation

Do not require unnecessary personal information. Do not promise a rescue
or response time based solely on submitting a form.

### Interaction states

1.  **Draft:** form is being completed.
2.  **Submitting:** prevent accidental duplicate submissions and show
    progress.
3.  **Submitted:** show a reference number if the backend has actually
    stored the report.
4.  **Pending review:** explain that the report has not yet been
    verified.
5.  **Failed:** preserve user-entered data where safe and explain
    whether it is possible to retry.
6.  **Offline / connection lost:** explain that the report has not been
    sent unless the system can confirm delivery.

A confirmation screen must not say that help is on the way unless an
authorised process has confirmed that.

## 6. Chief Administration operations UI

### Overall layout

Use a desktop-first operations shell that remains usable on tablets:

-   **Left sidebar:** overview, map, SOS, reports, rescue, shelters,
    relief, alerts, analytics.
-   **Top bar:** area/workspace name, language switch, current data
    freshness, notifications, user role, account menu.
-   **Main canvas:** operational content.
-   **Optional right drawer:** selected incident details, assignment,
    and activity history.

Keep important incident information above the fold. Use dense layouts
only where they improve scanning; preserve readable type and adequate
spacing.

### Operations overview

Suggested information cards:

-   Open incidents
-   Requests awaiting review
-   Verified incidents
-   Active response tasks
-   Shelter status
-   Relief stock alerts
-   Data freshness / service status

All counts must be calculated from the actual authorised dataset. If
using fixtures, mark them as simulated. Avoid decorative counters that
imply real emergency activity.

### Live operations map

The map should support:

-   Layer toggles for incidents, authorised team positions, shelters,
    roads/access, and relevant observations.
-   Legend with labels and status definitions.
-   Search and area filters.
-   Incident selection with a detail panel.
-   Source and last-updated timestamp for each layer.
-   Clear distinction between public and restricted layers.
-   Loading, no-data, permission-denied, stale-data, and map-provider
    failure states.

Do not expose sensitive response-team locations or personal locations on
public map layers by default. Do not infer that a road is safe solely
because no report is present.

### Incident desk

Each incident record should show:

-   Reference ID
-   Category and submitted time
-   Approximate location and location confidence
-   Description and attachments, if any
-   Verification state
-   Priority and rationale
-   Assigned team/task, if authorised
-   Status history and operator actions
-   Last updated time

Use explicit status text such as **Submitted**, **Under review**,
**Verified**, **Assigned**, **In progress**, **Resolved**, or
**Closed**. A status change should record who changed it and when.

### SOS queue

-   Restrict access to authorised roles.
-   Provide filters for status, age, category, and assigned team.
-   Show only necessary personal information.
-   Use clear priority criteria approved by the operating organisation.
-   Keep an audit trail of acknowledgement, assignment, and status
    changes.
-   In a demo, use simulated records and a persistent demo label.

### Rescue coordination

-   Team roster and availability, where maintained by an authorised
    partner.
-   Task assignment and acknowledgement.
-   Task location and relevant access notes.
-   Status: available, assigned, en route, on task, unavailable---only
    when these states are defined and maintained.
-   Handover notes and activity log.

Do not imply that a team is physically present or available unless the
information has been confirmed through the operating workflow.

### Shelters and relief

-   Shelter name and location.
-   Verification/source and last-confirmed time.
-   Capacity or availability only if reliably maintained.
-   Accessibility information where known.
-   Supplies by category, quantity, and update time.
-   Distribution records and outstanding needs.
-   Clear warning when capacity or stock data is stale.

### Analytics and exports

-   Response workflow durations.
-   Report categories and trends.
-   Verification rates.
-   Resource allocation and distribution.
-   Export controls restricted to authorised roles.
-   Aggregation and privacy controls to avoid exposing individual
    citizens unnecessarily.

Analytics should not present correlation as causation or make
unvalidated predictions look certain.

## 7. Business workspace UI

### Visual distinction

Keep the same brand typography and core colours, but give the business
workspace a more restrained, service-oriented appearance. Do not reuse
the Chief Administration command centre layout.

### Business overview

Show:

-   Organisation name and current plan/service agreement, if applicable.
-   Service status and planned maintenance.
-   Onboarding progress.
-   Open support tickets.
-   Invoices or renewal notices, where billing is implemented.
-   Links to documentation and account settings.

Do not display SOS totals, identifiable citizen reports, Chief Administration
incident queues, rescue-team positions, or private shelter operations in
the business dashboard unless a separate, documented permission
explicitly authorises a limited data view.

### Organisation management

-   Members and invitations.
-   Role assignments.
-   Organisation profile and locations.
-   Subscription/service details.
-   Support and implementation requests.
-   Audit history.

Enforce tenant isolation so one organisation cannot access another
organisation's records by changing IDs or URLs.

## 8. Parallax and motion design

### Where to use parallax

Use layered parallax on the public landing page and selected
storytelling sections, not on critical operational dashboards or form
workflows.

### Suggested hero layers

1.  **Base layer:** midnight navy gradient.
2.  **Distant layer:** subtle stars, rain particles, or cloud
    silhouettes.
3.  **Contour layer:** slow-moving topographic/rivershed lines.
4.  **River layer:** abstract branching cyan/teal lines.
5.  **Foreground layer:** brand mark and headline remain legible and
    mostly stable.

**Implemented 3D layer:** The concise homepage includes a decorative CSS-3D Supaul district diorama, a translucent six-face response cube, floating network/signal cards and depth-enhanced quick-action icons. Pointer and scroll parallax affect only this decorative geometry, not forms or operational dashboards. Reduced-motion and coarse-pointer modes retain static geometry without parallax or cube/ring animation; no WebGL library is required.

Movement should be subtle and should never reduce contrast behind text.
Avoid intense flashing, rapid rain, aggressive zooms, or motion that
resembles an active disaster when the page is only decorative.

### Interaction rules

-   Use small scroll-linked offsets; do not make the page feel like a
    game.
-   Keep all content reachable without animation.
-   Disable or significantly reduce parallax when
    `prefers-reduced-motion: reduce` is enabled.
-   Do not bind critical controls to scroll position.
-   Test on lower-end mobile devices and with touch input.
-   Avoid heavy video backgrounds; optimise any visual assets.
-   Ensure the page works if JavaScript or animation fails.

### Suggested motion timings

These are design starting points, not strict requirements:

-   Hover/focus transition: 150--220 ms.
-   Card entrance: 250--450 ms, only when helpful.
-   Background parallax: continuous and subtle, tied to scroll with a
    small movement range.
-   Loading indicator: simple and non-distracting.
-   Emergency form submission: clear progress feedback; never delay
    confirmation for decorative animation.

## 9. English/Hindi localisation

### Language switch

-   Place `EN | हिन्दी` in the global header.
-   On mobile, keep it visible in the menu and avoid hiding it deep in
    settings.
-   Preserve the chosen language across route changes and future visits.
-   Use translated labels for navigation, form fields, errors, empty
    states, tooltips, and accessibility names.
-   Keep user-submitted descriptions in the language entered by the
    citizen unless a clearly labelled translation is requested or
    provided.
-   Indicate when a translated advisory is unofficial or
    machine-translated, if applicable.

### Hindi layout checks

-   Use Noto Sans Devanagari or another tested Devanagari font.
-   Test matras, conjuncts, punctuation, numerals, and text wrapping.
-   Do not truncate important Hindi safety instructions.
-   Allow buttons and navigation items to grow to fit translated text.
-   Test screen-reader pronunciation and language attributes.
-   Choose date/time and number formatting deliberately and
    consistently.

## 10. Responsive behaviour

### Mobile public experience

-   Single-column action cards or a two-column grid where space allows.
-   Large touch targets.
-   Clear reporting CTA.
-   Forms broken into manageable sections.
-   Map controls that do not obscure the map or critical details.
-   Avoid large parallax effects that cause jank or interfere with
    scrolling.

### Tablet/desktop Chief Administration experience

-   Persistent sidebar where space allows.
-   Map and incident list can share the canvas.
-   Detail panel can open beside the map or as a drawer.
-   Filters should remain visible and understandable.

### Business experience

-   Responsive account navigation.
-   Tables transform into readable cards on small screens.
-   Billing and organisation settings must remain accessible by keyboard
    and screen reader.

## 11. Accessibility requirements

Target WCAG 2.2 AA as an implementation goal, subject to testing.

-   Keyboard-operable menus, dialogs, maps, and forms.
-   Visible focus indicators.
-   Semantic headings and landmarks.
-   Text alternatives for meaningful imagery.
-   Sufficient colour contrast.
-   Labels and actionable error messages for every form field.
-   No colour-only status indicators.
-   Reduced-motion support.
-   Accessible language switching.
-   Screen-reader announcements for submission results and important
    status updates.
-   Touch targets sized for mobile use.
-   Avoid timeouts that could cause users to lose a report without
    warning.

## 12. Security and privacy requirements

-   Enforce role permissions on the server and every protected API
    endpoint.
-   Separate public, Chief Administration, and business route layouts and access
    policies.
-   Scope all business records to the authenticated organisation.
-   Restrict Chief Administration incident data by role and operational need.
-   Use secure authentication, session handling, rate limits, input
    validation, and file-upload scanning.
-   Protect against IDOR/BOLA by testing attempts to access other users'
    or organisations' records.
-   Keep audit logs for sensitive access and status changes.
-   Define data retention, deletion, consent, and incident-response
    procedures.
-   Do not expose secrets in frontend code or repository history.
-   Avoid collecting precise location unless necessary and consented to.
-   Provide a privacy notice explaining what is collected and why.

## 13. Demo and live-service states

Every screen must make its data status clear.

### Demo mode

-   Persistent label: **DEMO --- Simulated data; not connected to
    emergency services.**
-   Use clearly fictional test records.
-   Do not send real SOS messages or imply that a report reached
    responders.
-   Avoid real personal data in screenshots and seed data.

### Live pilot mode

Only enable after the organisation has appropriate partners,
authorisation, trained monitoring staff, escalation procedures,
privacy/security controls, and tested reliability.

-   Identify the responsible organisation and operating hours.
-   Display source and freshness for operational information.
-   Explain what happens after a report is submitted.
-   Provide failure and fallback procedures.
-   Keep official emergency contact guidance available and verified.

## 14. Suggested implementation checklist

### Public

-   [ ] Public homepage with every public-facing option.
-   [ ] Report submission and clear success/failure states.
-   [ ] Map, alerts, shelters, preparedness, and about pages.
-   [ ] English/Hindi switch across public routes.
-   [ ] Persistent demo warning when using simulated data.

### Chief Administration

-   [ ] Separate Chief Administration layout and route group.
-   [ ] Role-authorised operations overview and map.
-   [ ] SOS and report queues.
-   [ ] Verification, assignment, rescue, shelter, and relief workflows.
-   [ ] Audit history and stale-data indicators.

### Business

-   [ ] Separate business layout and route group.
-   [ ] Organisation account and member management.
-   [ ] Services, implementation, support, and billing where applicable.
-   [ ] Tenant isolation and organisation-scoped permissions.
-   [ ] No implicit access to Chief Administration records or operations.

### Quality

-   [ ] Responsive testing.
-   [ ] Keyboard and screen-reader testing.
-   [ ] Hindi layout and translation review.
-   [ ] Reduced-motion testing.
-   [ ] Role/permission and cross-tenant security tests.
-   [ ] Simulated-data labels and failure-state testing.
-   [ ] Stakeholder review before any operational pilot.

------------------------------------------------------------------------

## Final design principle

**The public homepage should make help-related information easy to find.
The Chief Administration workspace should make authorised response work easier to
coordinate. The business workspace should manage commercial services
without exposing private Chief Administration operations.**

One brand, three distinct experiences, carefully controlled boundaries.
