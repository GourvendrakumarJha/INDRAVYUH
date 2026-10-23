# INDRAVYUH · Production and pilot checklist

This checklist is intentionally strict. A successful build does not make an emergency service operational.

## 1. Authority and operating model

- [ ] Name the legally responsible organisation and operational owner.
- [ ] Confirm which alerts may be published, by whom and from which authoritative sources.
- [ ] Define whether reports/SOS are monitored, by whom, during which hours and with what escalation path.
- [ ] Document fallback procedures for outages, stale data and lost connectivity.
- [ ] Run supervised tabletop exercises with community and response partners.
- [ ] Never advertise rescue dispatch, live monitoring, verified shelters or official alerts until each claim is true and authorised.

## 2. Security and identity

- [ ] Keep demo accounts disabled on any public or live deployment.
- [ ] Create unique least-privilege users; remove shared credentials.
- [ ] Add password recovery/rotation or a maintained identity provider.
- [ ] Use HTTPS, `COOKIE_SECURE=true`, the exact public `APP_ORIGIN` and correct trusted-proxy settings; keep `COOKIE_SAMESITE=strict` for same-site deployments and use `none` only when a cross-site embedding context requires it.
- [ ] Keep `AUTH_BEARER_FALLBACK=false` for ordinary production. If a trusted preview requires it, understand the persistent local/session browser-token trade-off; enable `COOKIE_PARTITIONED` only with SameSite=None over HTTPS.
- [ ] Restrict Google browser keys by referrer and API; keep private keys out of Vite variables.
- [ ] Run `npm test`, `npm run test:browser`, `npm run test:audit`, direct-URL/proxy tests and direct API cross-role tests against the actual deployment configuration.
- [ ] Perform an independent review of IDOR/BOLA, tenant isolation, session expiry, rate limits and upload handling.
- [ ] Add malware scanning and content-sniffing protection for operational file uploads.
- [ ] Configure central security logs, error monitoring and an incident-response process.

## 3. Privacy and data governance

- [ ] Document the purpose and lawful basis for every collected field.
- [ ] Define retention, deletion, backup and access-review schedules for reports, SOS, photos, sessions and audit logs.
- [ ] Restrict precise locations and personal contact data to the minimum authorised roles.
- [ ] Confirm that public incidents exclude SOS and expose only reduced, explicitly published coordinates.
- [ ] Review exports and screenshots for accidental personal-data disclosure.
- [ ] Publish a deployment-specific privacy notice and contact channel.

## 4. Data, maps and reliability

- [ ] Verify real shelter, capacity, accessibility, road and team data through authorised owners.
- [ ] Show source and last-confirmed time; mark stale/unavailable information clearly.
- [ ] Review map-provider terms, attribution, availability and offline fallback.
- [ ] Treat the simplified Supaul boundary as illustrative, not legal or survey geometry.
- [ ] Test tile/provider failure and ensure no-report is never interpreted as safe-route.
- [ ] Configure database backups and test restoration.
- [ ] Evaluate managed relational storage before horizontal/multi-instance scaling.

## 5. Language, accessibility and content

- [ ] Have qualified Hindi reviewers validate safety content, errors and workflow labels.
- [ ] Test Devanagari screen readers, matras, conjuncts and long labels on target devices.
- [ ] Complete keyboard, screen-reader, zoom, contrast, touch-target and reduced-motion audits against WCAG 2.2 AA.
- [ ] Review preparedness guidance against current official local sources.
- [ ] Test on lower-end mobile devices and constrained networks.

## 6. Deployment

- [ ] Use a persistent, access-controlled `DATA_DIR` outside the public web root.
- [ ] Keep `.env`, SQLite files, uploads and secrets out of source archives and git history.
- [ ] Run `npm ci`, `npm test`, `npm run build` and `npm audit --omit=dev` in CI.
- [ ] Configure `/api/health` monitoring, structured logs and uptime alerts.
- [ ] Set resource limits, request limits, proxy headers and backup alerts.
- [ ] Record a rollback plan and validate it.
- [ ] Start with a limited, supervised pilot only after all applicable items are signed off.
