/**
 * Day-driven data helpers.
 * Generates deterministic per-day variations of the static hotspot/zone data
 * to simulate temporal dynamics across the Day 1–10 timeline.
 * The original static data is never mutated.
 */

import { Hotspot, ZoneData, RiskLevel } from '../types/map-types';
import { mockHotspots } from './mock-hotspots';
import { mockZones } from './mock-zones';
import { nashikHotspots } from './nashik-hotspots';
import { nashikZones } from './nashik-zones';

// Seed-based deterministic "random" from step + id
export function seededFactor(step: number, id: string): number {
  let hash = 0;
  const seed = `${step}-${id}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 100) / 100; // 0..0.99
}

/**
 * Day multipliers model:
 * Days 1-5: gradually increasing risk (mosquito counts rising)
 * Day 6: peak (fogging intervention)
 * Days 7-10: declining (fogging effect)
 */
export function getDayMultiplier(day: number): number {
  const multipliers = [0.6, 0.7, 0.8, 0.9, 0.95, 1.0, 0.85, 0.65, 0.5, 0.45];
  return multipliers[day - 1] ?? 1.0;
}

function getRiskForCases(cases: number, originalRisk: RiskLevel): RiskLevel {
  // Shift risk level based on adjusted case count
  if (cases >= 10) return 'high';
  if (cases >= 4) return 'medium';
  return 'low';
}

/** Returns hotspots with cases/risk adjusted for the given day */
export function getHotspotsForDay(day: number): Hotspot[] {
  if (day === 1) return mockHotspots; // Day 1 = baseline data

  const mult = getDayMultiplier(day);
  return mockHotspots.map(h => {
    const jitter = seededFactor(day, h.id) * 0.3 - 0.15; // -0.15 to +0.15
    const adjustedCases = Math.max(0, Math.round(h.cases * (mult + jitter)));
    const adjustedRisk = getRiskForCases(adjustedCases, h.riskLevel);

    return {
      ...h,
      cases: adjustedCases,
      riskLevel: adjustedRisk,
      lastUpdated: day <= 1 ? h.lastUpdated : `Day ${day}`,
    };
  });
}

/** Returns zones with metrics adjusted for the given day */
export function getZonesForDay(day: number): ZoneData[] {
  if (day === 1) return mockZones; // Day 1 = baseline data

  const mult = getDayMultiplier(day);
  return mockZones.map(z => {
    const jitter = seededFactor(day, z.id) * 0.2 - 0.1;
    const adjustedCases = Math.max(0, Math.round(z.metrics.recentCases * (mult + jitter)));

    // Derive risk level from adjusted cases
    let riskLevel: RiskLevel;
    if (adjustedCases >= 50) riskLevel = 'high';
    else if (adjustedCases >= 15) riskLevel = 'medium';
    else riskLevel = 'low';

    // Derive trend
    const prevMult = getDayMultiplier(Math.max(1, day - 1));
    let caseTrend: 'increasing' | 'stable' | 'decreasing';
    if (mult > prevMult + 0.05) caseTrend = 'increasing';
    else if (mult < prevMult - 0.05) caseTrend = 'decreasing';
    else caseTrend = 'stable';

    // Temperature and humidity also fluctuate mildly
    const tempJitter = Math.round((seededFactor(day, z.id + 'T') - 0.5) * 4);
    const humJitter = Math.round((seededFactor(day, z.id + 'H') - 0.5) * 6);

    return {
      ...z,
      riskLevel,
      metrics: {
        ...z.metrics,
        recentCases: adjustedCases,
        caseTrend,
        temperature: z.metrics.temperature + tempJitter,
        humidity: Math.min(100, Math.max(40, z.metrics.humidity + humJitter)),
      },
    };
  });
}

/** Returns Nashik hotspots with cases/risk adjusted for the given day */
export function getNashikHotspotsForDay(day: number): Hotspot[] {
  if (day === 1) return nashikHotspots; // Day 1 = baseline data

  const mult = getDayMultiplier(day);
  return nashikHotspots.map(h => {
    const jitter = seededFactor(day, h.id) * 0.3 - 0.15; // -0.15 to +0.15
    const adjustedCases = Math.max(0, Math.round(h.cases * (mult + jitter)));
    const adjustedRisk = getRiskForCases(adjustedCases, h.riskLevel);

    return {
      ...h,
      cases: adjustedCases,
      riskLevel: adjustedRisk,
      lastUpdated: day <= 1 ? h.lastUpdated : `Day ${day}`,
    };
  });
}

/** Returns Nashik zones with metrics adjusted for the given day */
export function getNashikZonesForDay(day: number): ZoneData[] {
  if (day === 1) return nashikZones; // Day 1 = baseline data

  const mult = getDayMultiplier(day);
  return nashikZones.map(z => {
    const jitter = seededFactor(day, z.id) * 0.2 - 0.1;
    const adjustedCases = Math.max(0, Math.round(z.metrics.recentCases * (mult + jitter)));

    // Derive risk level from adjusted cases
    let riskLevel: RiskLevel;
    if (adjustedCases >= 50) riskLevel = 'high';
    else if (adjustedCases >= 15) riskLevel = 'medium';
    else riskLevel = 'low';

    // Derive trend
    const prevMult = getDayMultiplier(Math.max(1, day - 1));
    let caseTrend: 'increasing' | 'stable' | 'decreasing';
    if (mult > prevMult + 0.05) caseTrend = 'increasing';
    else if (mult < prevMult - 0.05) caseTrend = 'decreasing';
    else caseTrend = 'stable';

    // Temperature and humidity fluctuation
    const tempJitter = Math.round((seededFactor(day, z.id + 'T') - 0.5) * 4);
    const humJitter = Math.round((seededFactor(day, z.id + 'H') - 0.5) * 6);

    return {
      ...z,
      riskLevel,
      metrics: {
        ...z.metrics,
        recentCases: adjustedCases,
        caseTrend,
        temperature: z.metrics.temperature + tempJitter,
        humidity: Math.min(100, Math.max(40, z.metrics.humidity + humJitter)),
      },
    };
  });
}
