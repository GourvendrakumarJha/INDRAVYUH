import { chromium } from '@playwright/test';
import fs from 'node:fs';

const baseURL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const out = 'qa-screenshots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], checks = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const check = (name, condition) => { checks.push({ name, pass: Boolean(condition) }); if (!condition) throw new Error(`Browser check failed: ${name}`); };
const noOverflow = async (target, name) => {
  const dimensions = await target.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  check(`${name} has no horizontal page overflow`, dimensions.scroll <= dimensions.width + 1);
};

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  check('Fast homepage renders', (await page.locator('h1').first().textContent()).includes('Flood help for Supaul'));
  check('Direct homepage SOS renders', await page.locator('.hero-sos-button').isVisible());
  check('Seven public quick actions render', await page.locator('.home-quick-action').count() === 7);
  check('Single homepage environment notice', await page.locator('.home-demo-note').count() === 1);
  check('Direct citizen report action renders', await page.locator('.hero-citizen-button').isVisible());
  check('No 112, training or retired portal content on homepage', !/\b112\b|\btraining\b|Welfare Portal|Employee Portal/i.test(await page.locator('body').innerText()));
  await noOverflow(page, 'Desktop homepage');
  check('Visible 3D Supaul scene and six-face cube render', await page.locator('[data-testid="response-scene-3d"]').isVisible() && await page.locator('.cube-face').count() === 6);
  const camera = page.locator('.scene-3d-camera');
  const sceneBox = await page.locator('[data-testid="response-scene-3d"]').boundingBox();
  const pointerStart = await camera.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.move(sceneBox.x + sceneBox.width * 0.82, sceneBox.y + sceneBox.height * 0.3);
  await page.waitForTimeout(240);
  const pointerMoved = await camera.evaluate((element) => getComputedStyle(element).transform);
  check('Pointer movement creates visible 3D parallax', pointerStart !== pointerMoved);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);
  const scrollStart = await camera.evaluate((element) => getComputedStyle(element).transform);
  await page.evaluate(() => window.scrollTo(0, 260));
  await page.waitForTimeout(240);
  const scrollMoved = await camera.evaluate((element) => getComputedStyle(element).transform);
  check('Scrolling creates visible 3D depth parallax', scrollStart !== scrollMoved);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${out}/home-desktop-viewport.png` });
  await page.screenshot({ path: `${out}/home-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  check('Light mode persists', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
  await page.screenshot({ path: `${out}/home-desktop-light.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click();
  check('Hindi homepage renders', (await page.locator('h1').first().textContent()).includes('सुपौल'));
  await page.getByRole('button', { name: 'EN', exact: true }).click();

  await page.goto(`${baseURL}/access`, { waitUntil: 'networkidle' });
  const accessText = await page.locator('.access-portal-grid').innerText();
  check('Chief Administration and Specialized Action portal names render', accessText.includes('Chief Administration Portal') && accessText.includes('Specialized Action Portal'));

  await page.goto(`${baseURL}/map`, { waitUntil: 'networkidle' });
  check('Interactive Supaul map renders', await page.locator('.leaflet-container').count() === 1);
  check('Supaul landmarks render', await page.locator('.landmark-label').count() === 4);
  await page.getByRole('button', { name: 'Schematic view' }).click();
  check('Schematic map renders without tiles', await page.locator('.schematic-map svg').count() === 1);

  for (const [portal, heading] of [
    ['welfare', 'Chief Administration command center'], ['business', 'Welcome, Supaul Partner Organisation'], ['employee', 'Specialized Action workspace'],
  ]) {
    await page.goto(`${baseURL}/portals/${portal}`, { waitUntil: 'networkidle' });
    await page.locator('.demo-credentials button').click();
    await page.locator('.login-form button.btn').click();
    await page.waitForURL(`${baseURL}/${portal}`);
    await page.locator('.workspace-heading h1').waitFor();
    check(`${portal} dashboard loads`, (await page.locator('.workspace-heading h1').textContent()).includes(heading));
    await noOverflow(page, `${portal} dashboard`);
    await page.screenshot({ path: `${out}/${portal}-desktop.png`, fullPage: true });
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseURL, { waitUntil: 'networkidle' });
  await reducedPage.evaluate(() => window.scrollTo(0, 300));
  await reducedPage.waitForTimeout(180);
  check('Reduced motion freezes 3D scroll parallax', await reducedPage.evaluate(() => document.documentElement.style.getPropertyValue('--parallax-3d-y') === '0.00px'));
  check('Reduced motion disables cube and ring animation', await reducedPage.locator('.scene-core-cube').evaluate((element) => getComputedStyle(element).animationName === 'none') && await reducedPage.locator('.scene-ring-one').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  await reducedContext.close();

  const restrictedContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await restrictedContext.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { configurable: true, get() { throw new DOMException('Storage blocked by embedded preview', 'SecurityError'); } });
    }
  });
  const restrictedPage = await restrictedContext.newPage();
  restrictedPage.on('pageerror', (error) => errors.push(`restricted-storage pageerror: ${error.message}`));
  restrictedPage.on('console', (message) => { if (message.type() === 'error') errors.push(`restricted-storage console: ${message.text()}`); });
  for (const [portal, loginId, heading, section] of [
    ['welfare', '', 'Chief Administration command center', 'reports'],
    ['welfare', 'OPERATOR-DEMO', 'Chief Administration command center', 'map'],
    ['business', '', 'Welcome, Supaul Partner Organisation', 'coordination'],
    ['employee', '', 'Specialized Action workspace', 'tasks'],
  ]) {
    await restrictedPage.goto(`${baseURL}/portals/${portal}`, { waitUntil: 'networkidle' });
    await restrictedPage.locator('.demo-credentials button').click();
    if (loginId) await restrictedPage.locator('input[autocomplete="username"]').fill(loginId);
    await restrictedPage.locator('.login-form button.btn').click();
    await restrictedPage.waitForURL(`${baseURL}/${portal}`);
    await restrictedPage.locator('.stats-grid').waitFor();
    check(`${loginId || `${portal.toUpperCase()}-DEMO`} works with blocked cookies/storage`, (await restrictedPage.locator('.workspace-heading h1').innerText()).includes(heading));
    await restrictedPage.locator(`nav a[href="/${portal}/${section}"]`).first().click();
    await restrictedPage.waitForURL(`${baseURL}/${portal}/${section}`);
    await restrictedPage.locator('.workspace-heading h1').waitFor();
    await restrictedPage.waitForLoadState('networkidle');
    check(`${loginId || `${portal.toUpperCase()}-DEMO`} opens a private module with the in-memory session`, await restrictedPage.locator('.workspace-heading h1').isVisible() && await restrictedPage.locator('.error-state').count() === 0);
  }
  check('The restricted-storage test really blocks both storage APIs', await restrictedPage.evaluate(() => {
    for (const name of ['localStorage', 'sessionStorage']) { try { void window[name]; return false; } catch { /* expected */ } }
    return true;
  }));
  await restrictedContext.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobilePage.goto(baseURL, { waitUntil: 'networkidle' });
  await noOverflow(mobilePage, 'Mobile homepage');
  check('Mobile direct SOS is visible', await mobilePage.locator('.hero-sos-button').isVisible());
  await mobilePage.evaluate(() => window.scrollTo(0, 240));
  await mobilePage.waitForTimeout(180);
  check('Mobile 3D stays visible with static coarse-pointer parallax', await mobilePage.locator('[data-testid="response-scene-3d"]').isVisible() && await mobilePage.evaluate(() => document.documentElement.style.getPropertyValue('--parallax-3d-y') === '0.00px'));
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.waitForTimeout(180);
  check('Mobile emergency bar is visible', await mobilePage.locator('.mobile-emergency-bar').isVisible());
  const mobileBarBackground = await mobilePage.locator('.mobile-emergency-bar').evaluate((element) => getComputedStyle(element).backgroundColor);
  check('Mobile dark emergency bar uses ocean glass', mobileBarBackground === 'rgba(8, 34, 50, 0.94)');
  await mobilePage.screenshot({ path: `${out}/home-mobile.png`, fullPage: true });
  await mobilePage.goto(`${baseURL}/report`, { waitUntil: 'networkidle' });
  await noOverflow(mobilePage, 'Mobile report form');
  check('Mobile citizen service rail renders', await mobilePage.locator('.citizen-service-rail').isVisible());
  check('Mobile citizen form omits operational measurements', await mobilePage.getByLabel('Water level (cm)', { exact: true }).count() === 0 && await mobilePage.getByLabel('Flow velocity (m/s)', { exact: true }).count() === 0);
  await mobilePage.screenshot({ path: `${out}/report-mobile.png`, fullPage: true });
  await mobile.close();
} finally {
  await browser.close();
}
const result = { passed: checks.filter((item) => item.pass).length, total: checks.length, checks, errors };
fs.writeFileSync(`${out}/browser-smoke-results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (errors.length || result.passed !== result.total) process.exitCode = 1;
