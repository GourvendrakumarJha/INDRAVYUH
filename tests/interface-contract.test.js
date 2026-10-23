import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sourceFiles = [
  'src/pages/HomePage.jsx','src/pages/ReportPage.jsx','src/pages/HelpPage.jsx','src/pages/PreparednessPage.jsx','src/pages/AboutPage.jsx',
  'src/pages/AccessPage.jsx','src/pages/PortalLoginPage.jsx','src/pages/BusinessDashboard.jsx','src/pages/EmployeeDashboard.jsx','src/pages/WelfareDashboard.jsx',
  'src/components/PublicLayout.jsx','src/components/QuickSos.jsx','src/components/DemoBanner.jsx','src/components/WelfareLayout.jsx','src/components/EmployeeLayout.jsx',
  'src/components/FamilySafety.jsx','src/components/WelfareReportModal.jsx','src/context/LanguageContext.jsx','src/data/preparedness.js',
];

describe('requested visible-interface contract', () => {
  it('uses the new portal names without the retired labels or emergency 112 content', () => {
    const source = sourceFiles.map(read).join('\n');
    assert.match(source, /Chief Administration Portal/);
    assert.match(source, /Specialized Action Portal/);
    assert.doesNotMatch(source, /Welfare Portal|Employee Portal/);
    assert.doesNotMatch(source, /tel:112|Emergency 112|Call 112|112 पर|112 नंबर|112 emergency/i);
    assert.doesNotMatch(source, /training|प्रशिक्षण/i);
    assert.match(read('src/context/LanguageContext.jsx'), /hi:/);
    assert.match(read('src/main.jsx'), /noto-sans-devanagari/);
  });

  it('keeps operational measurement keys out of citizen reporting and in the Chief composer', () => {
    const citizen = read('src/pages/ReportPage.jsx');
    const chief = read('src/components/FieldReportComposer.jsx');
    for (const key of ['waterLevelCm','flowVelocityMs','rainfall1hMm','rainfall24hMm','riseRateCmh','accessCondition']) {
      assert.equal(citizen.includes(key), false, `citizen form contains ${key}`);
      assert.equal(chief.includes(key), true, `Chief form lacks ${key}`);
    }
    for (const feature of ['reporterName','peopleTrapped','vulnerableCount','CitizenServices','Family safety lookup','Open shelter finder']) assert.equal(citizen.includes(feature), true, feature);
    assert.match(citizen, /Operational water, weather and risk measurements are entered separately/);
  });

  it('provides decorative parallax, live counters and reduced-motion fallbacks', () => {
    const controller = read('src/components/MotionController.jsx');
    const styles = read('src/dynamic.css');
    const home = read('src/pages/HomePage.jsx');
    const scene = read('src/components/ResponseScene3D.jsx');
    assert.match(controller, /requestAnimationFrame/);
    assert.match(controller, /prefers-reduced-motion: reduce/);
    assert.match(controller, /--parallax-medium/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(styles, /\.hero-orb-one/);
    assert.match(home, /AnimatedNumber/);
    assert.match(home, /home-response-pulse/);
    assert.match(home, /ResponseScene3D/);
    assert.match(controller, /--parallax-3d-pitch/);
    assert.match(controller, /pointer: coarse/);
    assert.match(styles, /\.scene-3d-map/);
    assert.match(styles, /\.cube-front/);
    assert.equal((scene.match(/className="cube-face cube-/g) || []).length, 6);
    assert.match(scene, /SupaulOutline/);
    assert.equal((home.match(/DEMO — Simulated data; not connected to emergency services\./g) || []).length, 1);
  });

  it('exposes every specialized assignment type and outcome submission surface', () => {
    const employee = read('src/pages/EmployeeDashboard.jsx');
    const chief = read('src/components/ChiefCoordination.jsx');
    for (const type of ['citizen_verification','monitoring','communication','relief_supply','tracking','notification']) {
      assert.equal(employee.includes(type), true, type);
      assert.equal(chief.includes(type), true, type);
    }
    assert.match(employee, /Completion \/ verification note/);
    assert.match(employee, /Submit to Chief Administration/);
    assert.match(read('src/components/SpecializedActionFeed.jsx'), /CHIEF ADMINISTRATION FEEDBACK LOOP/);
  });
});
