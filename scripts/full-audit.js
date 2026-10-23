import { chromium } from '@playwright/test';
import fs from 'node:fs';

const baseURL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const out = 'qa-screenshots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, geolocation: { latitude: 26.1080847, longitude: 86.6033095, accuracy: 12 }, permissions: ['geolocation'] });
const page = await context.newPage();
const checks = [], failures = [], badResponses = [], runtimeErrors = [], externalMapRequests = [], privateRequests = [];
const submittedReferences = [];
const alertTitle = `Browser route blockage ${Date.now().toString(36).toUpperCase()} at Sadar Hospital`;
let cookieClearCount = 0;
const check = (name, condition) => { checks.push({ name, pass: Boolean(condition) }); if (!condition) failures.push(name); };
const reminderPattern = /simulated|not real|not connected|demo data|demo record|demo content|demo ticket|demo shelter|demo plan|demo credentials|demo store|fictional fixture/i;

await context.route('**/api/**', async (route) => {
  const request = route.request();
  const headers = { ...request.headers() };
  if (/\/api\/(welfare|business|employee)\//.test(request.url())) privateRequests.push({ url: request.url(), bearer: Boolean(headers.authorization?.startsWith('Bearer ')), secondary: Boolean(headers['x-indravyuh-session']) });
  await route.continue();
});
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
page.on('response', (response) => {
  if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() });
  if (/tile\.openstreetmap|maps\.googleapis|maps\.gstatic/.test(response.url())) externalMapRequests.push(response.url());
});
async function noOverflow(name, target = page) {
  const size = await target.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  check(`${name}: no page overflow`, size.content <= size.viewport + 1);
}
async function noRepeatedReminders(name, target = page) {
  const text = await target.locator('body').innerText();
  check(`${name}: no repeated demo/simulated notices`, !reminderPattern.test(text));
}
async function noRetiredContent(name, target = page) {
  const text = await target.locator('body').innerText();
  check(`${name}: no 112, training or retired portal content`, !/\b112\b|\btraining\b|प्रशिक्षण|Welfare Portal|Employee Portal/i.test(text));
}
async function visit(path, selector, name = path, target = page) {
  try {
    await target.goto(`${baseURL}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
    await target.locator(selector).first().waitFor({ state: 'visible', timeout: 15000 });
    check(`${name}: renders`, true);
    await noOverflow(name, target);
  } catch (error) { check(`${name}: ${error.message}`, false); }
}
async function login(portal) {
  await page.goto(`${baseURL}/portals/${portal}`, { waitUntil: 'networkidle' });
  await page.locator('.demo-credentials button').click();
  const values = await page.locator('.login-form input').evaluateAll((inputs) => inputs.map((input) => input.value));
  check(`${portal}: evaluation credentials autofill`, values[0].length > 3 && values[1] === 'Supaul@2026');
  await page.locator('.login-form button.btn').click();
  await page.waitForURL(`${baseURL}/${portal}`, { timeout: 15000 });
  await page.locator('.workspace-heading h1').waitFor({ timeout: 15000 });
  await context.clearCookies(); cookieClearCount += 1;
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.workspace-heading h1').waitFor({ timeout: 15000 });
  check(`${portal}: login, reload and dashboard after browser cookies are cleared`, true);
}

let sosReference = '', sosAccessCode = '';
try {
  await visit('/', '.fast-home .home-hero', 'Public homepage');
  check('Homepage has direct SOS action', await page.locator('.hero-sos-button').isVisible());
  check('Homepage has seven fast actions', await page.locator('.home-quick-action').count() === 7);
  check('Homepage notice appears once', await page.locator('.home-demo-note').count() === 1);
  check('Homepage notice wording', (await page.locator('.home-demo-note').innerText()).includes('DEMO — Simulated data; not connected to emergency services.'));
  check('Ocean scene renders', await page.locator('.ocean-scene svg').isVisible());
  check('Glass treatment is active', await page.locator('.home-quick-action').first().evaluate((element) => getComputedStyle(element).backdropFilter !== 'none'));
  check('Dark mode is the default', await page.evaluate(() => document.documentElement.dataset.theme === 'dark'));
  await page.screenshot({ path: `${out}/revision-home-dark.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  check('Light mode applies', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  check('Light mode persists after reload', await page.evaluate(() => document.documentElement.dataset.theme === 'light' && localStorage.getItem('indravyuh-theme') === 'light'));
  await page.screenshot({ path: `${out}/revision-home-light.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  check('Dark mode persists after reload', await page.evaluate(() => document.documentElement.dataset.theme === 'dark'));
  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click();
  check('Hindi homepage translation', (await page.locator('h1').first().textContent()).includes('सुपौल'));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await noRetiredContent('Public homepage');
  check('Homepage has a direct citizen-report action', await page.locator('.hero-citizen-button').isVisible());
  check('Homepage animated public counters render', await page.locator('.home-response-pulse strong').count() === 3 && Number(await page.locator('.home-response-pulse strong').first().innerText()) > 0);
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(120);
  check('Parallax responds to scrolling', await page.evaluate(() => Math.abs(parseFloat(document.documentElement.style.getPropertyValue('--parallax-medium'))) > 0));
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.locator('.hero-sos-button').click();
  await page.locator('.modal-panel .quick-sos-live').waitFor();
  check('SOS presents no incident form', await page.locator('.modal-panel form').count() === 0);
  await page.screenshot({ path: `${out}/revision-home-sos.png` });
  await page.locator('.quick-sos-result').waitFor({ timeout: 20000 });
  const codes = await page.locator('.quick-code strong').allTextContents();
  [sosReference, sosAccessCode] = codes;
  submittedReferences.push(sosReference);
  check('Homepage SOS returns a reference and private code', /^IV-SUP-SOS-/.test(sosReference) && sosAccessCode.length >= 8);
  check('Homepage SOS shows its GPS origin', (await page.locator('.quick-sos-result').innerText()).includes('26.108085, 86.603309'));
  await page.getByRole('link', { name: 'Track SOS' }).click();
  await page.locator('.track-card form button.btn').click();
  await page.locator('.tracking-result').waitFor();
  check('Homepage SOS can be tracked with both codes', (await page.locator('.tracking-result').innerText()).includes(sosReference));

  const publicRoutes = [
    ['/report', '.report-form'], ['/help', '.quick-sos-inline'], ['/map', '.leaflet-container'], ['/alerts', '.alert-list'],
    ['/shelters', '.shelter-grid'], ['/family-safety', '.family-public-card'], ['/preparedness', '.safety-grid'], ['/track', '.track-card'], ['/about', '.about-policy-grid'], ['/access', '.access-portal-grid'],
  ];
  for (const [path, selector] of publicRoutes) {
    await visit(path, selector, `Public ${path}`);
    await noRepeatedReminders(`Public ${path}`);
    await noRetiredContent(`Public ${path}`);
    if (path === '/access') {
      const accessText = await page.locator('.access-portal-grid').innerText();
      check('Renamed portals are visible on access page', accessText.includes('Chief Administration Portal') && accessText.includes('Specialized Action Portal'));
    }
    if (path === '/report') {
      check('Citizen service rail renders', await page.locator('.citizen-service-rail').isVisible());
      let measurementInputs = 0;
      for (const label of ['Water level (cm)','Flow velocity (m/s)','Rainfall · 1h (mm)','Rainfall · 24h (mm)','Rise rate (cm/hr)','Access condition']) measurementInputs += await page.getByLabel(label, { exact: true }).count();
      check('Citizen form has no operational measurement inputs', measurementInputs === 0);
    }
    if (path === '/preparedness') check('Preparedness checklist is removed', await page.locator('.checklist, .prep-checklist, input[type="checkbox"]').count() === 0);
    if (path === '/alerts') {
      const alertText = await page.locator('.alert-list').innerText();
      check('College water alert is operationally specific', alertText.includes('Water reaching Supaul College of Engineering'));
      check('Raghopur alert names blocked routes', alertText.includes('All routes blocked in Raghopur') && alertText.includes('Routes: Blocked'));
    }
  }
  await page.goto(`${baseURL}/map`, { waitUntil: 'networkidle' });
  check('Local vector map has 12 locality labels', await page.locator('.locality-label').count() === 12);
  check('Four Supaul landmark labels render', await page.locator('.landmark-label').count() === 4);
  check('Supaul College of Engineering is listed', (await page.locator('.landmark-list').innerText()).includes('Supaul College of Engineering'));
  check('Default map makes no external map requests', externalMapRequests.length === 0);
  await page.screenshot({ path: `${out}/revision-map-landmarks.png`, fullPage: true });
  await page.getByRole('button', { name: 'Schematic view' }).click();
  check('Schematic map includes landmarks', (await page.locator('.schematic-map').innerText()).includes('Engineering College'));

  await page.goto(`${baseURL}/report`, { waitUntil: 'networkidle' });
  await page.locator('select').first().selectOption('waterlogging');
  await page.locator('textarea').first().fill('Automated browser report workflow verification.');
  await page.locator('input[placeholder*="Nirmali"]').fill('Supaul browser verification point');
  await page.locator('.consent-field input').check();
  await page.locator('.submit-report').click();
  await page.locator('.confirmation-card').waitFor({ timeout: 15000 });
  const reportReference = await page.locator('.code-grid strong').first().innerText();
  submittedReferences.push(reportReference);
  check('Public report stores and returns private credentials', (await page.locator('.confirmation-card').innerText()).includes('Private access code'));

  await page.goto(`${baseURL}/family-safety`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create a check-in' }).click();
  await page.getByLabel('Name *').fill('Browser Family Member');
  await page.getByLabel('Area / ward / village *').fill('Supaul');
  await page.locator('.consent-field input').check();
  await page.getByRole('button', { name: 'Save family check-in' }).click();
  await page.locator('.family-public-card .confirmation-card').waitFor();
  const familyCodes = await page.locator('.quick-code strong').allTextContents();
  await page.getByRole('button', { name: 'Find a check-in' }).click();
  await page.getByLabel('Family reference').fill(familyCodes[0]);
  await page.getByLabel('Private access code').fill(familyCodes[1]);
  await page.getByRole('button', { name: 'Search check-in' }).click();
  await page.locator('.family-result').waitFor();
  check('Family check-in supports two-code public lookup', (await page.locator('.family-result').innerText()).includes('Browser Family Member'));

  await login('welfare');
  const secondTab = await context.newPage();
  await secondTab.goto(`${baseURL}/welfare`, { waitUntil: 'networkidle' });
  await secondTab.locator('.workspace-heading h1').waitFor();
  check('Chief Administration session works in a second browser tab without cookies', (await secondTab.locator('.workspace-heading h1').innerText()).includes('Chief Administration command center'));
  await secondTab.close();
  const welfareRoutes = [
    ['', '.stats-grid'], ['/map', '.leaflet-container'], ['/sos', '.restricted-banner'], ['/reports', '.workspace-toolbar'],
    ['/coordination', '.coordination-compose'], ['/rescue', '.rescue-team-grid'], ['/shelters', '.ops-shelter-grid'], ['/relief', '.data-table'], ['/alerts', '.ops-alert-list'],
    ['/analytics', '.analytics-grid'], ['/audit', '.data-table'],
  ];
  for (const [path, selector] of welfareRoutes) {
    await visit(`/welfare${path}`, selector, `Chief Administration ${path || '/overview'}`);
    await noRepeatedReminders(`Chief Administration ${path || '/overview'}`);
    await noRetiredContent(`Chief Administration ${path || '/overview'}`);
    if (path === '') check('District command and response board renders', await page.locator('.command-response-board').isVisible());
    if (path === '/map' || path === '/analytics') check(`Risk analytics renders in Chief Administration ${path}`, await page.locator('.risk-analytics-panel').isVisible());
    if (path === '/relief') check('Relief logistics and delivery board renders', await page.locator('.logistics-panel').isVisible());
  }
  await page.goto(`${baseURL}/welfare/sos`, { waitUntil: 'networkidle' });
  await page.locator('.search-field input').fill(sosReference);
  check('Homepage SOS is present in Chief Administration SOS queue', await page.locator('.reference-button', { hasText: sosReference }).count() === 1);
  await page.locator('.reference-button', { hasText: sosReference }).click();
  await page.locator('.event-timeline').waitFor();
  check('SOS detail and event history open', await page.locator('.report-update-form').isVisible());
  check('SOS response timeline renders', await page.locator('.sos-response-timeline').isVisible());
  await page.getByRole('button', { name: 'Acknowledge SOS' }).click();
  await page.locator('.sos-next-action h4', { hasText: 'Next: Dispatched' }).waitFor();
  await page.locator('.sos-next-action select').selectOption('TEAM-DEMO-01');
  await page.getByRole('button', { name: 'Dispatch team' }).click();
  await page.locator('.sos-next-action h4', { hasText: 'Next: Responding' }).waitFor();
  await page.getByRole('button', { name: 'Mark responding' }).click();
  await page.locator('.sos-next-action h4', { hasText: 'Next: Resolved' }).waitFor();
  await page.getByLabel('People assisted (optional)').fill('2');
  await page.getByRole('button', { name: 'Resolve SOS' }).click();
  await page.locator('.sos-response-panel', { hasText: 'Response resolved.' }).waitFor();
  check('SOS acknowledgement, dispatch, responding and resolution work in the browser', true);
  await page.locator('.modal-head .icon-button').click();

  await page.goto(`${baseURL}/welfare/reports`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'New measured field report' }).click();
  let chiefMeasurementInputs = 0;
  for (const label of ['Water level (cm)','Flow velocity (m/s)','Rainfall · 1h (mm)','Rainfall · 24h (mm)','Rise rate (cm/hr)','Access condition']) chiefMeasurementInputs += await page.getByLabel(label, { exact: true }).count();
  check('Chief Administration measured field form contains all six operational inputs', chiefMeasurementInputs === 6);
  await page.getByLabel('Area / landmark *').fill('Supaul College of Engineering browser approach');
  await page.getByLabel('Situation report *').fill('Chief Administration browser field report for the college approach.');
  await page.getByRole('button', { name: 'Submit field report' }).click();
  await page.locator('.staff-report-form, .compact-confirmation').waitFor();
  await page.locator('.compact-confirmation').waitFor();
  check('Chief Administration personnel can submit their own measured field report', (await page.locator('.compact-confirmation').innerText()).includes('Field report added'));
  await page.getByRole('button', { name: 'Return to reports' }).click();

  await page.goto(`${baseURL}/welfare/shelters`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Family check-ins' }).click();
  await page.locator('.family-manager').waitFor();
  check('Chief Administration can review family check-ins', (await page.locator('.family-manager').innerText()).includes('Browser Family Member'));

  await page.goto(`${baseURL}/welfare/relief`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create delivery' }).click();
  await page.getByLabel('Quantity *').fill('1');
  await page.getByLabel('Destination *').fill('Supaul College of Engineering coordination point');
  await page.getByLabel('Allocation note *').fill('Browser verification delivery allocation.');
  await page.getByRole('button', { name: /Allocate stock & create delivery/ }).click();
  await page.locator('.logistics-panel .inline-message', { hasText: 'Delivery' }).waitFor();
  check('Chief Administration can allocate stock and create a delivery', true);

  await page.goto(`${baseURL}/welfare/alerts`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'New advisory' }).click();
  await page.getByLabel('English title').fill(alertTitle);
  await page.getByLabel('हिन्दी शीर्षक').fill('सदर अस्पताल पर ब्राउज़र मार्ग अवरोध');
  await page.getByLabel('Affected area *').fill('Supaul');
  await page.getByLabel('Specific landmark').fill('Sadar Hospital');
  await page.getByLabel('Route condition *').selectOption('Blocked');
  await page.getByLabel('English notice').fill('The Sadar Hospital east approach is blocked for this browser workflow.');
  await page.getByLabel('हिन्दी सूचना').fill('इस ब्राउज़र कार्यप्रवाह के लिए सदर अस्पताल का पूर्वी मार्ग अवरुद्ध है।');
  await page.getByRole('button', { name: 'Create advisory' }).click();
  const browserAlert = page.locator('.ops-alert', { hasText: alertTitle });
  await browserAlert.waitFor();
  await browserAlert.getByRole('button', { name: 'Publish advisory' }).click();
  await page.locator('.ops-alert', { hasText: alertTitle }).getByText('Published', { exact: true }).waitFor();
  check('Area, landmark and route-specific alert can be drafted and published', true);

  await page.goto(`${baseURL}/welfare/coordination`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Request organisation support', exact: true }).click();
  await page.locator('.coordination-compose textarea').fill('Coordinate the browser verification relief route.');
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await page.locator('.inline-message', { hasText: 'Organisation request sent.' }).waitFor();
  check('Chief Administration sends an organisation request', true);
  await page.getByRole('button', { name: 'Assign specialized action', exact: true }).click();
  await page.locator('.coordination-compose textarea').fill('Verify the browser coordination workflow.');
  await page.getByRole('button', { name: 'Assign online action', exact: true }).click();
  await page.locator('.inline-message', { hasText: 'Specialized action assigned.' }).waitFor();
  check('Chief Administration assigns a citizen-verification action', true);
  await page.screenshot({ path: `${out}/revision-welfare-coordination.png`, fullPage: true });

  await login('business');
  const businessRoutes = [
    ['', '.business-overview-grid'], ['/organisation', '.business-form'], ['/members', '.data-table'], ['/services', '.service-card-grid'],
    ['/coordination', '.business-panel'], ['/billing', '.billing-summary'], ['/implementation', '.implementation-list'], ['/analytics', '.analytics-grid'], ['/support', '.ticket-list'], ['/audit', '.data-table'],
  ];
  for (const [path, selector] of businessRoutes) {
    await visit(`/business${path}`, selector, `Business ${path || '/overview'}`);
    await noRepeatedReminders(`Business ${path || '/overview'}`);
    await noRetiredContent(`Business ${path || '/overview'}`);
  }
  await page.goto(`${baseURL}/business/coordination`, { waitUntil: 'networkidle' });
  const sharedRequest = page.locator('tbody tr', { hasText: 'Relief support' }).first();
  check('Business receives the Chief Administration request', await sharedRequest.count() === 1);
  await sharedRequest.locator('select').selectOption('Accepted');
  await page.locator('.inline-message', { hasText: 'Request status updated.' }).waitFor();
  check('Business updates shared request status', true);
  await page.screenshot({ path: `${out}/revision-business-coordination.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  check('Portal light mode applies', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  check('Portal light mode persists', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
  await page.screenshot({ path: `${out}/revision-business-light.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();

  await login('employee');
  const employeeRoutes = [
    ['', '.employee-overview-grid'], ['/tasks', '.employee-task-list'], ['/notices', '.employee-notice-grid'], ['/leave', '.employee-panel'],
    ['/documents', '.document-grid'], ['/profile', '.profile-grid'],
  ];
  for (const [path, selector] of employeeRoutes) {
    await visit(`/employee${path}`, selector, `Specialized Action ${path || '/overview'}`);
    await noRepeatedReminders(`Specialized Action ${path || '/overview'}`);
    await noRetiredContent(`Specialized Action ${path || '/overview'}`);
  }
  await page.goto(`${baseURL}/employee/tasks`, { waitUntil: 'networkidle' });
  const assignedTask = page.locator('.employee-task', { hasText: 'Verify citizen report' }).first();
  check('Specialized Action receives citizen-verification task without an unrelated delivery link', await assignedTask.count() === 1 && (await assignedTask.innerText()).includes('Report ·') && !(await assignedTask.innerText()).includes('Delivery ·'));
  await assignedTask.locator('select').selectOption('Completed');
  await page.locator('.modal-panel').waitFor();
  await page.getByLabel('Completion / verification note *').fill('Browser verification evidence checked and outcome returned.');
  await page.getByRole('button', { name: 'Submit to Chief Administration' }).click();
  await page.locator('.inline-message', { hasText: 'Verification submitted to Chief Administration' }).waitFor();
  check('Specialized Action submits a verification outcome', (await assignedTask.innerText()).includes('Completed'));
  await page.screenshot({ path: `${out}/revision-employee-tasks.png`, fullPage: true });

  await login('welfare');
  await page.goto(`${baseURL}/welfare/coordination`, { waitUntil: 'networkidle' });
  const chiefOutcome = page.locator('.specialized-action-feed tbody tr', { hasText: 'Verify citizen report' }).first();
  await chiefOutcome.waitFor();
  check('Verification outcome is visible back in Chief Administration', (await chiefOutcome.innerText()).includes('Completed') && (await chiefOutcome.innerText()).includes('Verified'));

  const cookieContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cookiePage = await cookieContext.newPage();
  await cookiePage.goto(`${baseURL}/portals/welfare`, { waitUntil: 'networkidle' });
  await cookiePage.locator('.demo-credentials button').click();
  await cookiePage.locator('.login-form button.btn').click();
  await cookiePage.waitForURL(`${baseURL}/welfare`);
  await cookiePage.evaluate(() => { localStorage.setItem('iv_preview_session', 'stale-preview-token'); sessionStorage.setItem('iv_preview_session', 'stale-preview-token'); });
  await cookiePage.goto(`${baseURL}/welfare/reports`, { waitUntil: 'networkidle' });
  await cookiePage.locator('.workspace-toolbar').waitFor();
  check('A stale stored token does not override a valid session cookie', await cookiePage.locator('.error-state').count() === 0);
  await cookieContext.clearCookies();
  await cookiePage.goto(`${baseURL}/welfare/sos`, { waitUntil: 'networkidle' });
  await cookiePage.waitForURL(`${baseURL}/portals/welfare`);
  await cookiePage.locator('.login-form').waitFor();
  check('A fully expired session returns to sign-in without a generic error panel', await cookiePage.locator('.error-state').count() === 0);
  await cookieContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseURL, { waitUntil: 'networkidle' });
  await reducedPage.evaluate(() => window.scrollTo(0, 320));
  await reducedPage.waitForTimeout(120);
  check('Reduced motion disables parallax variables', await reducedPage.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--parallax-medium')) === 0));
  check('Reduced motion disables decorative transforms', await reducedPage.locator('.hero-orb-one').evaluate((element) => getComputedStyle(element).transform === 'none'));
  await noOverflow('Reduced-motion homepage', reducedPage);
  await reducedContext.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (error) => runtimeErrors.push(`mobile: ${error.message}`));
  mobilePage.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(`mobile: ${message.text()}`); });
  mobilePage.on('response', (response) => { if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() }); });
  for (const [path, selector] of [['/', '.home-hero'], ['/report', '.report-form'], ['/map', '.leaflet-container'], ['/access', '.access-portal-grid']]) {
    await visit(path, selector, `Mobile ${path}`, mobilePage);
    await noRetiredContent(`Mobile ${path}`, mobilePage);
  }
  await mobilePage.goto(baseURL, { waitUntil: 'networkidle' });
  check('Mobile direct SOS remains visible', await mobilePage.locator('.hero-sos-button').isVisible());
  check('Mobile emergency bar remains visible', await mobilePage.locator('.mobile-emergency-bar').isVisible());
  await mobilePage.screenshot({ path: `${out}/revision-home-mobile.png`, fullPage: true });
  await mobile.close();
} catch (error) {
  failures.push(`Audit stopped: ${error.message}`);
} finally {
  await browser.close();
}
check('No HTTP 4xx/5xx responses during full audit', badResponses.length === 0);
check('No browser runtime/console errors during full audit', runtimeErrors.length === 0);
check('No external map requests with the local provider', externalMapRequests.length === 0);
check('Every private browser API request used Bearer and secondary-header fallback', privateRequests.length > 0 && privateRequests.every((item) => item.bearer && item.secondary));
const result = { passed: checks.filter((c) => c.pass).length, total: checks.length, failures, badResponses, runtimeErrors, externalMapRequests, privateRequestCount: privateRequests.length, cookieClearCount, submittedReferences, checks };
fs.writeFileSync('qa-screenshots/full-audit-results.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, checks: undefined }, null, 2));
if (failures.length) process.exitCode = 1;
