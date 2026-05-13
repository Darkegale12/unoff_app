import { useState, useEffect } from 'react';
import {
  X, AlertTriangle, Droplets, Trees, Moon, Eye, Activity,
  Thermometer, Cloud, MapPin, TrendingUp, Wifi, Video
} from 'lucide-react';
import { loadSpectralForCell, SpectralValues } from '../data/spectral-loader';

export interface SelectedCell {
  row: number;
  col: number;
  cell_id: string;
  lat: number;
  lon: number;
}

export interface RiskCellData {
  avg_risk: number;
  risk_category_label: string;
  uncertainty: number;
  phase: string;
  climate?: {
    temperature_c: number;
    rainfall_mm: number;
    humidity_pct: number;
  };
  intervention?: {
    triggered: boolean;
    reason: string;
    zones: string[];
  };
}

export interface FeatureCellData {
  water: number;
  vegetation: number;
  shadow: number;
  water_proximity: number;
  risk_proxy: number;
}

interface InspectionPanelProps {
  selectedCell: SelectedCell;
  riskData: RiskCellData;
  featureData: FeatureCellData | null;
  onClose: () => void;
  videoUrl?: string | null;
}

function ScoreBar({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: typeof Droplets;
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          <span className="text-xs font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

function SpectralBar({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  if (value === null) return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 italic">Loading…</span>
    </div>
  );

  const displayVal = Math.abs(value) < 10 ? value.toFixed(4) : value.toFixed(1);
  // Normalize for bar display: NDVI/NDWI range from -1 to 1, LST from 0-50
  let barPct = 0;
  if (label === 'LST') {
    barPct = Math.min(100, Math.max(0, (value / 50) * 100));
  } else {
    barPct = Math.min(100, Math.max(0, ((value + 1) / 2) * 100));
  }

  const barColor = label === 'NDVI' ? '#22c55e'
    : label === 'NDWI' || label === 'MNDWI' ? '#3b82f6'
    : label === 'LST' ? '#ef4444'
    : label === 'NDBI' ? '#f59e0b'
    : '#8b5cf6';

  return (
    <div className="py-1.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{displayVal}{unit || ''}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function getRiskCategoryColor(label: string): string {
  switch (label) {
    case 'High': return '#d6312b';
    case 'Medium': return '#f4a35a';
    case 'Low': return '#4393c3';
    default: return '#94a3b8';
  }
}

export function InspectionPanel({
  selectedCell, riskData, featureData, onClose, videoUrl
}: InspectionPanelProps) {
  const [spectral, setSpectral] = useState<SpectralValues | null>(null);
  const [spectralLoading, setSpectralLoading] = useState(true);

  // Load spectral data on cell selection change
  useEffect(() => {
    let cancelled = false;
    setSpectralLoading(true);
    setSpectral(null);

    loadSpectralForCell(selectedCell.lat, selectedCell.lon).then((data) => {
      if (!cancelled) {
        setSpectral(data);
        setSpectralLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [selectedCell.lat, selectedCell.lon]);

  const riskColor = getRiskCategoryColor(riskData.risk_category_label);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Cell {selectedCell.cell_id}</h2>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: riskColor }}
            >
              {riskData.risk_category_label.toUpperCase()} RISK
            </span>
            <span className="text-xs text-gray-500">
              {selectedCell.lat.toFixed(4)}°N, {selectedCell.lon.toFixed(4)}°E
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Section 1: Risk Context */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Risk Context
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-3 rounded-xl border border-red-100">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Risk</p>
              <p className="text-xl font-bold" style={{ color: riskColor }}>
                {(riskData.avg_risk * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Uncertainty</p>
              <p className="text-xl font-bold text-blue-700">
                {(riskData.uncertainty * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Phase</p>
              <p className="text-sm font-bold text-gray-800">
                {riskData.phase === 'pre' ? '🔍 Pre-Treatment' : '💉 Post-Treatment'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Grid Position</p>
              <p className="text-sm font-bold text-gray-800">
                Row {selectedCell.row}, Col {selectedCell.col}
              </p>
            </div>
          </div>

          {/* Climate */}
          {riskData.climate && (
            <div className="mt-3 flex gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-medium text-orange-800">{riskData.climate.temperature_c}°C</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-blue-800">{riskData.climate.rainfall_mm}mm</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-50 rounded-lg border border-cyan-100">
                <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-xs font-medium text-cyan-800">{riskData.climate.humidity_pct}%</span>
              </div>
            </div>
          )}

          {/* Intervention Alert */}
          {riskData.intervention?.triggered && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-800">INTERVENTION ACTIVE</span>
              </div>
              <p className="text-xs text-red-700">{riskData.intervention.reason}</p>
              {riskData.intervention.zones.length > 0 && (
                <p className="text-[10px] text-red-600 mt-1">
                  Zones: {riskData.intervention.zones.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Feature Scores (FeatureTeam) */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-500" />
            CV Feature Scores
          </h3>
          {featureData ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <ScoreBar label="Water Detection" value={featureData.water} color="#2563eb" icon={Droplets} />
              <ScoreBar label="Vegetation" value={featureData.vegetation} color="#16a34a" icon={Trees} />
              <ScoreBar label="Shadow" value={featureData.shadow} color="#6b7280" icon={Moon} />
              <ScoreBar label="Water Proximity" value={featureData.water_proximity} color="#0891b2" icon={Wifi} />
              <ScoreBar label="Risk Proxy" value={featureData.risk_proxy} color="#dc2626" icon={TrendingUp} />
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <Eye className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No CV pipeline data available for this cell</p>
            </div>
          )}
        </div>

        {/* Section 3: Spectral Signals (DataTeam) */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" />
            Spectral Signals
            <span className="text-[10px] text-gray-400 font-normal">(Sentinel-2)</span>
          </h3>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {spectralLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full" />
                <span className="ml-2 text-xs text-gray-500">Loading spectral data…</span>
              </div>
            ) : (
              <div className="space-y-1">
                <SpectralBar label="NDVI" value={spectral?.ndvi ?? null} />
                <SpectralBar label="NDWI" value={spectral?.ndwi ?? null} />
                <SpectralBar label="NDBI" value={spectral?.ndbi ?? null} />
                <SpectralBar label="MNDWI" value={spectral?.mndwi ?? null} />
                <SpectralBar label="NDMI" value={spectral?.ndmi ?? null} />
                <SpectralBar label="LST" value={spectral?.lst ?? null} unit="°C" />
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-3 text-center">
              Source: Sentinel-2 • Spatial resolution: ~10m
            </p>
          </div>
        </div>

        {/* Section 4: Drone Video Slot */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-500" />
            Drone Feed
          </h3>
          {videoUrl ? (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <video
                src={videoUrl}
                controls
                className="w-full aspect-video bg-black"
                poster=""
              />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6 text-center">
              <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-500">Drone Feed</p>
              <p className="text-[10px] text-gray-400 mt-1">
                See Video CV Demo tab for recorded survey playback
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
