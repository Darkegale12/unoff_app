# IN-VBDM Synthetic Data Integration Guide
## For App Team — `invbd_DEV` (React + Leaflet + Recharts)

---

## Files Delivered

| File | Purpose | App Component |
|------|---------|---------------|
| `synthetic_timeseries.json` | 10-step sensor time-series, counts, fogging flag | `RiskMap.tsx`, `Dashboard.tsx` |
| `feature_layers.geojson.json` | Standing water, vegetation, container risk overlays | `LayerControl.tsx`, `RiskMap.tsx` |
| `intervention_and_placement.json` | Fogging zone polygon + recommended next LunchBox pins | `RiskMap.tsx`, `ZoneDetailPanel.tsx` |

Place all files in: `src/app/data/synthetic/`

---

## 1. Time-Series Data (`synthetic_timeseries.json`)

### Schema
```typescript
interface Timestep {
  step: number;           // 1–10
  day_label: string;      // "Day 1", "Day 6 — FOGGING", etc.
  fogged: boolean;        // true from step 6 onward
  intervention_event: InterventionEvent | null;
  sensors: SensorReading[];
}

interface SensorReading {
  id: string;             // "LB-01" … "LB-10"
  lat: number;
  lng: number;
  count: number;          // mosquito event count
  active: boolean;
}

interface InterventionEvent {
  type: "fogging";
  timestamp: string;      // ISO 8601
  zone_center: [number, number];  // [lat, lng]
  zone_radius_m: number;
  operator: string;
  notes: string;
}
```

### Usage in `RiskMap.tsx`
```tsx
import timeseriesData from '../data/synthetic/synthetic_timeseries.json';

// State
const [currentStep, setCurrentStep] = useState(1);
const stepData = timeseriesData.timesteps[currentStep - 1];

// Render sensor markers
stepData.sensors.map(sensor => (
  <CircleMarker
    key={sensor.id}
    center={[sensor.lat, sensor.lng]}
    radius={6 + sensor.count * 0.3}
    fillColor={getSensorColor(sensor.count)}
    fillOpacity={0.85}
  >
    <Popup>{sensor.id}: {sensor.count} counts</Popup>
  </CircleMarker>
))

// Heatmap — pass sensor positions weighted by count
const heatPoints = stepData.sensors.map(s => [s.lat, s.lng, s.count / 40]);
```

### Color Scale (use for sensor circles + heatmap)
```typescript
function getSensorColor(count: number): string {
  if (count >= 25) return '#ff0000';      // red — critical
  if (count >= 15) return '#ff6600';      // orange — high
  if (count >= 8)  return '#ffcc00';      // yellow — medium
  return '#00cc44';                        // green — low
}
```

### Time Slider Component (MISSING — build this first)
```tsx
// Add to RiskMap or as a floating panel:
<input
  type="range"
  min={1}
  max={10}
  value={currentStep}
  onChange={(e) => setCurrentStep(Number(e.target.value))}
/>
<span>{stepData.day_label}</span>
{stepData.fogged && <Badge color="red">🔥 Post-Fogging</Badge>}
```

---

## 2. Feature Layers (`feature_layers.geojson.json`)

### Three sublayers — toggle independently:

| Layer Key | Type | Render Style |
|-----------|------|-------------|
| `standing_water.features` | Polygon | Blue fill, opacity 0.4 |
| `vegetation_density.features` | Polygon | Green fill, opacity 0.35 |
| `container_risk.features` | Point | Orange CircleMarker, radius 8 |

### Usage in `LayerControl.tsx`
```tsx
import featureData from '../data/synthetic/feature_layers.geojson.json';

// Layer toggles (add to existing LayerControl state):
const [showWater, setShowWater] = useState(false);
const [showVeg, setShowVeg] = useState(false);
const [showContainers, setShowContainers] = useState(false);

// In RiskMap render:
{showWater && featureData.standing_water.features.map(f => (
  <Polygon
    key={f.properties.id}
    positions={f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
    pathOptions={{ color: '#0066ff', fillColor: '#0066ff', fillOpacity: 0.4, weight: 1 }}
  >
    <Popup>
      <b>{f.properties.name}</b><br/>
      Risk: {(f.properties.risk_score * 100).toFixed(0)}%<br/>
      {f.properties.notes}
    </Popup>
  </Polygon>
))}

{showContainers && featureData.container_risk.features.map(f => (
  <CircleMarker
    key={f.properties.id}
    center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
    radius={8}
    pathOptions={{ color: '#ff6600', fillColor: '#ff9900', fillOpacity: 0.9, weight: 2 }}
  >
    <Popup>
      <b>{f.properties.name}</b><br/>
      Larvae: {f.properties.larvae_present ? '⚠️ YES' : 'No'}<br/>
      Risk: {(f.properties.risk_score * 100).toFixed(0)}%
    </Popup>
  </CircleMarker>
))}
```

### Note on coordinate order
GeoJSON uses `[longitude, latitude]`. Leaflet expects `[latitude, longitude]`.
Always swap: `[lng, lat] → [lat, lng]`

---

## 3. Fogging Zone & Next Placement (`intervention_and_placement.json`)

### Fogging Zone
Show this polygon when `stepData.fogged === true` (step 6+):
```tsx
import interventionData from '../data/synthetic/intervention_and_placement.json';

{stepData.fogged && interventionData.fogging_zone.features.map(f => (
  <Polygon
    key={f.properties.id}
    positions={f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
    pathOptions={{
      color: '#cc0000',
      fillColor: '#ff4444',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '8 4'
    }}
  >
    <Popup>
      <b>🔥 {f.properties.label}</b><br/>
      Method: {f.properties.method}<br/>
      Operator: {f.properties.operator}<br/>
      Reduction: <b>{f.properties.reduction_pct}%</b> at 48h
    </Popup>
  </Polygon>
))}
```

### Next Placement (Gold Pin) — show at step 10
```tsx
{currentStep === 10 && interventionData.next_placement.features.map(f => (
  <Marker
    key={f.properties.id}
    position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
    icon={goldPinIcon}   // create custom DivIcon with gold color
  >
    <Popup>
      <b>⭐ {f.properties.label}</b><br/>
      EI Score: {f.properties.EI_score}<br/>
      Priority: #{f.properties.placement_priority}<br/>
      {f.properties.reason}
    </Popup>
  </Marker>
))}

// Gold pin icon:
const goldPinIcon = L.divIcon({
  html: '<div style="background:#FFD700;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #B8860B;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  className: ''
});
```

---

## 4. Dashboard Integration (`Dashboard.tsx` / `Recharts`)

Use `synthetic_timeseries.json` to drive the time-series chart:

```typescript
// Compute total counts per step for area chart
const trendData = timeseriesData.timesteps.map(t => ({
  name: t.day_label.replace(' — FOGGING', ''),
  total: t.sensors.reduce((sum, s) => sum + s.count, 0),
  hotspot: t.sensors.find(s => s.id === 'LB-05')?.count ?? 0,
  fogged: t.fogged
}));

// Reference line at step 6 for fogging
<ReferenceLine x="Day 6" stroke="#ff4444" strokeDasharray="4 2" label="Fogging" />
```

### KPI Cards to add
```
Pre-fog peak: 38 counts (LB-05, Day 6)
Post-fog 48h: 15 counts (LB-05, Day 8)
Reduction:    60.5%
Hotspot confirmed: YES (18.5308°N, 73.8474°E)
```

---

## 5. Demo Narrative Mapping

| Demo Beat | Step | Data |
|-----------|------|------|
| "10 LunchBoxes deployed" | Step 1 | All 10 `sensors` from `synthetic_timeseries.json` |
| "Day 3 — activity clustering" | Step 3 | `LB-05` count = 24, heatmap brightens near [18.5308, 73.8474] |
| "Drone confirmed standing water" | Any | Toggle `feature_layers.geojson.json` → `standing_water` layer |
| "We fogged on Day 6" | Step 6 | Click "Mark Intervention" → show `fogging_zone` polygon |
| "Counts dropped 60%" | Step 8 | `LB-05` count falls from 38 → 15; show reduction KPI |
| "Place next LunchBox here" | Step 10 | Gold pin appears from `next_placement` at [73.8444, 18.5262] |

---

## 6. Current App State vs Gaps

| Feature | Status | Data Ready |
|---------|--------|-----------|
| Multi-tenant login (PCMC/Nashik/DBT) | ✅ Present | — |
| Dashboard shell / map view | ✅ Present | — |
| Sensor markers on map | ✅ (hardcoded) | ✅ Use `synthetic_timeseries.json` step 1 |
| Heatmap layer | ⚠️ Partial/static | ✅ Drive from `sensor.count` per step |
| **Time slider** | ❌ Missing | ✅ Provided — build first |
| Feature layer overlay (water/veg/containers) | ❌ Missing | ✅ `feature_layers.geojson.json` |
| **Adaptive placement recommendation** | ❌ Missing | ✅ `next_placement` in `intervention_and_placement.json` |
| Intervention zone (fogging polygon) | ❌ Missing | ✅ `fogging_zone` in `intervention_and_placement.json` |
| Pre/post comparison toggle | ❌ Missing | ✅ Use `fogged` boolean from timeseries |
| Reduction KPI card | ❌ Missing | ✅ `reduction_metric` in timeseries |
| Time-series chart in dashboard | ⚠️ Static mock | ✅ Replace with `trendData` derived above |

---

## 7. Recommended Build Order (to hit demo readiness)

1. **Time Slider** — wires step state to all layers. Everything depends on this.
2. **Sensor markers → step-driven** — replace hardcoded data with timeseries step.
3. **Heatmap → step-driven** — update weights per step.
4. **Feature layer toggles** — add water/veg/container to LayerControl.
5. **Fogging zone polygon** — render when `fogged === true`.
6. **Gold pin** — render at step 10.
7. **KPI cards** — reduction_metric in dashboard.
8. **Trend chart** — replace mock with computed trendData.

---

## 8. Expected Integration Schema from Other Teams

When real data arrives, it must match this envelope exactly so the app is plug-and-play:

```json
{
  "timesteps": [
    {
      "step": 1,
      "day_label": "...",
      "fogged": false,
      "sensors": [
        { "id": "LB-01", "lat": 0.0, "lng": 0.0, "count": 0, "active": true }
      ]
    }
  ]
}
```

Feature GeoJSON must be standard RFC 7946 `FeatureCollection` with `properties.risk_score` and `properties.name` for popups. No custom projection — WGS84 only.
