import { useEffect, useRef } from 'react';
import { gridLayers } from '../data/mock-grid-data';
import { Hotspot, ZoneData } from '../types/map-types';
import { IngestedGeoJsonLayer } from './GeoJSONIngestion';
import timeseriesData from '../data/synthetic/synthetic_timeseries.json';
import featureData from '../data/synthetic/feature_layers.geojson.json';
import interventionData from '../data/synthetic/intervention_and_placement.json';

interface RiskMapProps {
  zones: ZoneData[];
  hotspots: Hotspot[];
  selectedZone: string | null;
  onZoneClick: (zoneId: string) => void;
  activeLayers: string[];
  center: [number, number];
  basemap?: 'streets' | 'satellite';
  geoJsonLayers?: IngestedGeoJsonLayer[];
  currentStep: number;
  onStepChange: (step: number) => void;
  showWater: boolean;
  showVegetation: boolean;
  showContainers: boolean;
}

function getSensorColor(count: number): string {
  if (count >= 25) return '#ff0000';
  if (count >= 15) return '#ff6600';
  if (count >= 8) return '#ffcc00';
  return '#00cc44';
}

export function RiskMap({
  zones, hotspots, selectedZone, onZoneClick, activeLayers, center,
  basemap = 'streets', geoJsonLayers = [],
  currentStep, onStepChange, showWater, showVegetation, showContainers
}: RiskMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<Map<string, any>>(new Map());
  const hotspotLayersRef = useRef<any[]>([]);
  const gridLayersMapRef = useRef<Map<string, any[]>>(new Map());
  const basemapLayerRef = useRef<any>(null);
  const geoJsonLayersRef = useRef<Map<string, any>>(new Map());

  // Synthetic data layer refs
  const sensorMarkersRef = useRef<any[]>([]);
  const waterLayersRef = useRef<any[]>([]);
  const vegLayersRef = useRef<any[]>([]);
  const containerLayersRef = useRef<any[]>([]);
  const foggingLayersRef = useRef<any[]>([]);
  const placementLayersRef = useRef<any[]>([]);

  const getRiskColor = (zone: ZoneData, layerId: string) => {
    if (layerId === 'risk') {
      switch (zone.riskLevel) {
        case 'high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#22c55e';
        default: return '#94a3b8';
      }
    } else if (layerId === 'temperature') {
      const temp = zone.metrics.temperature;
      if (temp > 32) return '#ef4444';
      if (temp > 28) return '#f59e0b';
      return '#22c55e';
    } else if (layerId === 'population') {
      const pop = zone.metrics.population;
      if (pop > 50000) return '#ef4444';
      if (pop > 25000) return '#f59e0b';
      return '#22c55e';
    } else if (layerId === 'cases') {
      const cases = zone.metrics.recentCases;
      if (cases > 50) return '#ef4444';
      if (cases > 20) return '#f59e0b';
      return '#22c55e';
    } else if (layerId === 'traps') {
      const traps = zone.metrics.trapCount;
      if (traps < 3) return '#ef4444';
      if (traps < 6) return '#f59e0b';
      return '#22c55e';
    }
    return '#94a3b8';
  };

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstanceRef.current) {
      const loadLeaflet = async () => {
        const L = (await import('leaflet')).default;
        const map = L.map(mapRef.current!, {
          center: center,
          zoom: 12,
          zoomControl: true,
          scrollWheelZoom: true,
        });
        const basemapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        basemapLayerRef.current = L.tileLayer(basemapUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;

        zones.forEach((zone) => {
          const coordinates = zone.coordinates.map((coord) =>
            Array.isArray(coord) ? [coord[1], coord[0]] : [(coord as any).lng, (coord as any).lat]
          );
          const geoJsonFeature = {
            type: 'Feature',
            properties: { zoneId: zone.id, zoneName: zone.name },
            geometry: { type: 'Polygon', coordinates: [coordinates] },
          };
          const color = getRiskColor(zone, 'risk');
          const isSelected = selectedZone === zone.id;
          const layer = L.geoJSON(geoJsonFeature as any, {
            style: {
              fillColor: color, fillOpacity: 0, color: color,
              weight: isSelected ? 5 : 3,
            },
            onEachFeature: (_feature, layer) => {
              layer.on({
                click: () => { onZoneClick(zone.id); },
                mouseover: (e) => { if (selectedZone !== zone.id) e.target.setStyle({ weight: 4 }); },
                mouseout: (e) => { if (selectedZone !== zone.id) e.target.setStyle({ weight: 3 }); },
              });
              const layerCenter = (layer as any).getBounds().getCenter();
              L.marker(layerCenter, {
                icon: L.divIcon({
                  className: 'zone-label',
                  html: `<div style="font-size:14px;font-weight:bold;color:#1e293b;text-shadow:1px 1px 2px white,-1px -1px 2px white,1px -1px 2px white,-1px 1px 2px white;pointer-events:none;white-space:nowrap;">${zone.name}</div>`,
                  iconSize: [100, 20],
                }),
              }).addTo(map);
            },
          }).addTo(map);
          layersRef.current.set(zone.id, layer);
        });

        hotspots.forEach((hotspot) => {
          const getHotspotColor = (level: string) => {
            switch (level) {
              case 'high': return '#dc2626';
              case 'medium': return '#ea580c';
              case 'low': return '#16a34a';
              default: return '#6b7280';
            }
          };
          const color = getHotspotColor(hotspot.riskLevel);
          const radiusInMeters = Math.sqrt(hotspot.area / Math.PI);
          const circle = L.circle([hotspot.center[0], hotspot.center[1]], {
            color, fillColor: color, fillOpacity: 0.6, radius: radiusInMeters, weight: 2,
          }).addTo(map);
          circle.bindPopup(`
            <div style="font-family:system-ui,-apple-system,sans-serif;">
              <h3 style="margin:0 0 8px 0;font-weight:bold;font-size:14px;">${hotspot.name}</h3>
              <div style="font-size:12px;color:#374151;">
                <div><strong>Area:</strong> ${hotspot.area} m²</div>
                <div><strong>Cases:</strong> ${hotspot.cases}</div>
                <div><strong>Risk:</strong> ${hotspot.riskLevel.toUpperCase()}</div>
                <div><strong>Updated:</strong> ${hotspot.lastUpdated}</div>
              </div>
            </div>
          `);
          if (hotspot.area >= 100) {
            L.marker([hotspot.center[0], hotspot.center[1]], {
              icon: L.divIcon({
                className: 'hotspot-label',
                html: `<div style="font-size:11px;font-weight:600;color:white;background-color:${color};padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${hotspot.area}m² - ${hotspot.cases} cases</div>`,
                iconSize: [80, 20],
              }),
            }).addTo(map);
          }
          hotspotLayersRef.current.push(circle);
        });
      };
      loadLeaflet();
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Update zone styles
  useEffect(() => {
    if (mapInstanceRef.current) {
      zones.forEach((zone) => {
        const layer = layersRef.current.get(zone.id);
        if (layer) {
          const color = getRiskColor(zone, 'risk');
          const isSelected = selectedZone === zone.id;
          layer.setStyle({ fillColor: color, fillOpacity: 0, color, weight: isSelected ? 5 : 3 });
        }
      });
    }
  }, [activeLayers, selectedZone, zones]);

  // Grid layers
  useEffect(() => {
    if (mapInstanceRef.current) {
      const loadLeaflet = async () => {
        const L = (await import('leaflet')).default;
        gridLayersMapRef.current.forEach((rectangles) => {
          rectangles.forEach((rect: any) => mapInstanceRef.current.removeLayer(rect));
        });
        gridLayersMapRef.current.clear();
        const activeGridLayerIds = activeLayers.filter(layerId => gridLayers.some(gl => gl.id === layerId));
        if (activeGridLayerIds.length > 0) {
          layersRef.current.forEach((layer, zoneId) => {
            const zone = zones.find(z => z.id === zoneId);
            if (zone) {
              const isSelected = selectedZone === zoneId;
              const color = getRiskColor(zone, 'risk');
              layer.setStyle({ fillOpacity: 0, color, weight: isSelected ? 5 : 3, opacity: 1 });
            }
          });
          activeGridLayerIds.forEach(layerId => {
            const gridLayer = gridLayers.find(gl => gl.id === layerId);
            if (gridLayer) {
              const rectangles: any[] = [];
              gridLayer.data.forEach((cell) => {
                const rectangle = L.rectangle(cell.bounds, {
                  fillColor: gridLayer.colorScale(cell.value), fillOpacity: 0.25,
                  color: '#ffffff', weight: 0.5, opacity: 0.15,
                }).addTo(mapInstanceRef.current);
                rectangle.bindTooltip(`<div style="font-size:11px;"><strong>${gridLayer.name}</strong><br/>Value: ${cell.label}</div>`, { sticky: true });
                rectangles.push(rectangle);
              });
              gridLayersMapRef.current.set(layerId, rectangles);
            }
          });
        } else {
          const zoneLayerId = activeLayers.find(id => ['risk', 'temperature', 'population', 'cases', 'traps'].includes(id));
          layersRef.current.forEach((layer, zoneId) => {
            const zone = zones.find(z => z.id === zoneId);
            if (zone) {
              const isSelected = selectedZone === zoneId;
              const color = zoneLayerId ? getRiskColor(zone, zoneLayerId) : getRiskColor(zone, 'risk');
              layer.setStyle({ fillColor: color, fillOpacity: 0, color, weight: isSelected ? 5 : 3, opacity: 1 });
            }
          });
        }
      };
      loadLeaflet();
    }
  }, [activeLayers, zones, selectedZone]);

  // Center
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, 16, { animate: true, duration: 1 });
    }
  }, [center]);

  // Ingested GeoJSON layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default;
      const currentIds = new Set(geoJsonLayers.map(l => l.id));
      geoJsonLayersRef.current.forEach((layer, id) => {
        if (!currentIds.has(id)) {
          mapInstanceRef.current.removeLayer(layer);
          geoJsonLayersRef.current.delete(id);
        }
      });
      geoJsonLayers.forEach(gl => {
        if (!geoJsonLayersRef.current.has(gl.id)) {
          try {
            const layer = L.geoJSON(gl.geojson, {
              style: { color: gl.color, fillColor: gl.color, fillOpacity: 0.2, weight: 2, opacity: 0.8 },
              pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
                radius: 8, fillColor: gl.color, color: gl.color, weight: 1, opacity: 0.9, fillOpacity: 0.7,
              }),
              onEachFeature: (feature, layer) => {
                if (feature.properties) {
                  const props = Object.entries(feature.properties)
                    .filter(([, v]) => v !== null)
                    .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('');
                  if (props) layer.bindPopup(`<div style="font-size:12px;">${props}</div>`);
                }
              },
            }).addTo(mapInstanceRef.current);
            geoJsonLayersRef.current.set(gl.id, layer);
          } catch (e) {
            console.error('Failed to render GeoJSON layer:', gl.name, e);
          }
        }
      });
    };
    loadLeaflet();
  }, [geoJsonLayers]);

  // Basemap
  useEffect(() => {
    if (mapInstanceRef.current && basemapLayerRef.current) {
      const loadLeaflet = async () => {
        const L = (await import('leaflet')).default;
        mapInstanceRef.current.removeLayer(basemapLayerRef.current);
        let basemapUrl: string;
        let basemapAttribution: string;
        if (basemap === 'satellite') {
          basemapUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
          basemapAttribution = 'Tiles &copy; Esri';
        } else {
          basemapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
          basemapAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        }
        basemapLayerRef.current = L.tileLayer(basemapUrl, { attribution: basemapAttribution, maxZoom: 19 }).addTo(mapInstanceRef.current);
        basemapLayerRef.current.bringToBack();
      };
      loadLeaflet();
    }
  }, [basemap]);

  // === SYNTHETIC DATA: Sensor markers driven by currentStep ===
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default;
      // Clear old sensor markers
      sensorMarkersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m));
      sensorMarkersRef.current = [];

      const stepData = timeseriesData.timesteps[currentStep - 1];
      if (!stepData) return;

      stepData.sensors.forEach(sensor => {
        const color = getSensorColor(sensor.count);
        const marker = L.circleMarker([sensor.lat, sensor.lng], {
          radius: 6 + sensor.count * 0.3,
          fillColor: color, color: '#333', weight: 1.5,
          fillOpacity: 0.85,
        }).addTo(mapInstanceRef.current);
        marker.bindPopup(`
          <div style="font-family:system-ui;font-size:12px;">
            <b>${sensor.id}</b><br/>
            Count: <b>${sensor.count}</b><br/>
            Status: ${sensor.active ? '🟢 Active' : '⚪ Inactive'}
          </div>
        `);
        sensorMarkersRef.current.push(marker);
      });
    };
    loadLeaflet();
  }, [currentStep]);

  // === SYNTHETIC DATA: Feature layer overlays ===
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default;

      // Standing Water
      waterLayersRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      waterLayersRef.current = [];
      if (showWater) {
        featureData.standing_water.features.forEach((f: any) => {
          const layer = L.polygon(
            f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]),
            { color: '#0066ff', fillColor: '#0066ff', fillOpacity: 0.4, weight: 1 }
          ).addTo(mapInstanceRef.current);
          layer.bindPopup(`<b>${f.properties.name}</b><br/>Risk: ${(f.properties.risk_score * 100).toFixed(0)}%<br/>${f.properties.notes}`);
          waterLayersRef.current.push(layer);
        });
      }

      // Vegetation
      vegLayersRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      vegLayersRef.current = [];
      if (showVegetation) {
        featureData.vegetation_density.features.forEach((f: any) => {
          const layer = L.polygon(
            f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]),
            { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.35, weight: 1 }
          ).addTo(mapInstanceRef.current);
          layer.bindPopup(`<b>${f.properties.name}</b><br/>NDVI: ${f.properties.ndvi}<br/>${f.properties.notes}`);
          vegLayersRef.current.push(layer);
        });
      }

      // Container Risk
      containerLayersRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      containerLayersRef.current = [];
      if (showContainers) {
        featureData.container_risk.features.forEach((f: any) => {
          const layer = L.circleMarker(
            [f.geometry.coordinates[1], f.geometry.coordinates[0]],
            { radius: 8, color: '#ff6600', fillColor: '#ff9900', fillOpacity: 0.9, weight: 2 }
          ).addTo(mapInstanceRef.current);
          layer.bindPopup(`<b>${f.properties.name}</b><br/>Larvae: ${f.properties.larvae_present ? '⚠️ YES' : 'No'}<br/>Risk: ${(f.properties.risk_score * 100).toFixed(0)}%`);
          containerLayersRef.current.push(layer);
        });
      }
    };
    loadLeaflet();
  }, [showWater, showVegetation, showContainers]);

  // === SYNTHETIC DATA: Fogging zone + Placement pins ===
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default;
      const stepData = timeseriesData.timesteps[currentStep - 1];

      // Fogging zone
      foggingLayersRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      foggingLayersRef.current = [];
      if (stepData?.fogged) {
        interventionData.fogging_zone.features.forEach((f: any) => {
          const layer = L.polygon(
            f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]),
            { color: '#cc0000', fillColor: '#ff4444', fillOpacity: 0.15, weight: 2, dashArray: '8 4' }
          ).addTo(mapInstanceRef.current);
          layer.bindPopup(`<b>🔥 ${f.properties.label}</b><br/>Method: ${f.properties.method}<br/>Operator: ${f.properties.operator}<br/>Reduction: <b>${f.properties.reduction_pct}%</b> at 48h`);
          foggingLayersRef.current.push(layer);
        });
      }

      // Placement pins
      placementLayersRef.current.forEach(l => mapInstanceRef.current.removeLayer(l));
      placementLayersRef.current = [];
      if (currentStep === 10) {
        interventionData.next_placement.features.forEach((f: any) => {
          const isGold = f.properties.placement_priority === 1;
          const pinColor = isGold ? '#FFD700' : '#C0C0C0';
          const borderColor = isGold ? '#B8860B' : '#808080';
          const icon = L.divIcon({
            html: `<div style="background:${pinColor};width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid ${borderColor};box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconSize: [20, 20], iconAnchor: [10, 20], className: ''
          });
          const marker = L.marker(
            [f.geometry.coordinates[1], f.geometry.coordinates[0]], { icon }
          ).addTo(mapInstanceRef.current);
          marker.bindPopup(`<b>⭐ ${f.properties.label}</b><br/>EI Score: ${f.properties.EI_score}<br/>Priority: #${f.properties.placement_priority}<br/>${f.properties.reason}`);
          placementLayersRef.current.push(marker);
        });
      }
    };
    loadLeaflet();
  }, [currentStep]);

  const stepData = timeseriesData.timesteps[currentStep - 1];

  return (
    <div className="h-full w-full relative overflow-hidden">
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* Time Slider Panel */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderRadius: 12, padding: '12px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', gap: 16, minWidth: 420,
        border: '1px solid rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
              {stepData?.day_label || `Step ${currentStep}`}
            </span>
            {stepData?.fogged && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#dc2626',
                background: '#fef2f2', padding: '2px 8px', borderRadius: 100,
                border: '1px solid #fecaca'
              }}>
                🔥 Post-Fogging
              </span>
            )}
          </div>
          <input
            type="range" min={1} max={10} value={currentStep}
            onChange={(e) => onStepChange(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
            <span>Day 1</span><span>Day 10</span>
          </div>
        </div>
        <div style={{
          fontSize: 11, color: '#64748b', textAlign: 'center', minWidth: 60,
          padding: '4px 8px', background: '#f1f5f9', borderRadius: 8
        }}>
          Step<br /><span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{currentStep}</span>/10
        </div>
      </div>
    </div>
  );
}
