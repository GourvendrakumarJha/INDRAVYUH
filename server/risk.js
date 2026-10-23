export const RISK_METHOD = [
  { key: 'waterLevelCm', label: 'Water level', weight: 30, threshold: 180, unit: 'cm' },
  { key: 'flowVelocityMs', label: 'Flow velocity', weight: 20, threshold: 2.5, unit: 'm/s' },
  { key: 'rainfall1hMm', label: 'Rainfall intensity', weight: 15, threshold: 75, unit: 'mm / 1h' },
  { key: 'riseRateCmh', label: 'Rise rate', weight: 15, threshold: 20, unit: 'cm/hr' },
  { key: 'people', label: 'People & vulnerability', weight: 15, threshold: 100, unit: 'impact points' },
  { key: 'accessCondition', label: 'Access disruption', weight: 5, threshold: 'Blocked', unit: '' },
];

const clamp = (value, maximum = 100) => Math.min(maximum, Math.max(0, value));
const finite = (value) => value != null && Number.isFinite(Number(value));
const points = (value, threshold, weight) => finite(value) ? clamp(Number(value) / threshold * weight, weight) : 0;

/**
 * Deterministic triage aid based only on submitted field measurements.
 * Missing groups contribute no points and make the result partial; no live
 * readings or missing values are invented.
 */
export function calculateRisk(data) {
  const groups = {
    water: finite(data.waterLevelCm),
    velocity: finite(data.flowVelocityMs),
    rainfall: finite(data.rainfall1hMm),
    rise: finite(data.riseRateCmh),
    people: finite(data.peopleCount) && finite(data.peopleTrapped) && finite(data.vulnerableCount),
    access: ['Open', 'Restricted', 'Blocked'].includes(data.accessCondition),
  };
  const supplied = Object.values(groups).filter(Boolean).length;
  if (!supplied) return { riskScore: null, riskBand: null, riskConfidence: null, components: [] };

  const impactPoints = groups.people
    ? Number(data.peopleCount) * 0.5 + Number(data.peopleTrapped) * 2 + Number(data.vulnerableCount)
    : 0;
  const accessPoints = { Open: 1, Restricted: 3, Blocked: 5 };
  const components = [
    { key: 'waterLevelCm', label: 'Water level', points: points(data.waterLevelCm, 180, 30), value: data.waterLevelCm, unit: 'cm', weight: 30, threshold: 180, supplied: groups.water },
    { key: 'flowVelocityMs', label: 'Flow velocity', points: points(data.flowVelocityMs, 2.5, 20), value: data.flowVelocityMs, unit: 'm/s', weight: 20, threshold: 2.5, supplied: groups.velocity },
    { key: 'rainfall1hMm', label: 'Rainfall intensity', points: points(data.rainfall1hMm, 75, 15), value: data.rainfall1hMm, unit: 'mm / 1h', weight: 15, threshold: 75, supplied: groups.rainfall },
    { key: 'riseRateCmh', label: 'Rise rate', points: points(data.riseRateCmh, 20, 15), value: data.riseRateCmh, unit: 'cm/hr', weight: 15, threshold: 20, supplied: groups.rise },
    { key: 'people', label: 'People & vulnerability', points: points(impactPoints, 100, 15), value: groups.people ? impactPoints : null, unit: 'impact points', weight: 15, threshold: 100, supplied: groups.people },
    { key: 'accessCondition', label: 'Access disruption', points: groups.access ? accessPoints[data.accessCondition] : 0, value: data.accessCondition || null, unit: '', weight: 5, threshold: 'Blocked', supplied: groups.access },
  ].map((component) => ({ ...component, points: Math.round(component.points) }));
  const riskScore = Math.round(components.reduce((sum, component) => sum + component.points, 0));
  const riskBand = riskScore >= 75 ? 'Critical' : riskScore >= 55 ? 'High' : riskScore >= 30 ? 'Moderate' : 'Low';
  return { riskScore, riskBand, riskConfidence: supplied === 6 ? 'Complete' : 'Partial', components };
}

export function riskColumns(data) {
  const risk = calculateRisk(data);
  return {
    water_level_cm: data.waterLevelCm ?? null,
    flow_velocity_ms: data.flowVelocityMs ?? null,
    rainfall_1h_mm: data.rainfall1hMm ?? null,
    rainfall_24h_mm: data.rainfall24hMm ?? null,
    rise_rate_cmh: data.riseRateCmh ?? null,
    people_trapped: data.peopleTrapped ?? null,
    vulnerable_count: data.vulnerableCount ?? null,
    access_condition: data.accessCondition ?? null,
    risk_score: risk.riskScore,
    risk_band: risk.riskBand,
    risk_confidence: risk.riskConfidence,
  };
}

export function riskFromRecord(record) {
  return calculateRisk({
    waterLevelCm: record.water_level_cm,
    flowVelocityMs: record.flow_velocity_ms,
    rainfall1hMm: record.rainfall_1h_mm,
    rainfall24hMm: record.rainfall_24h_mm,
    riseRateCmh: record.rise_rate_cmh,
    peopleCount: record.people_count,
    peopleTrapped: record.people_trapped,
    vulnerableCount: record.vulnerable_count,
    accessCondition: record.access_condition,
  });
}
