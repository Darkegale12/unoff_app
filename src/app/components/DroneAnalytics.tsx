import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Camera, Droplets, Trees, Moon, AlertTriangle, TrendingUp, Activity, Eye } from 'lucide-react';
import cvScoresData from '../data/cv-pipeline/cv-scores.json';
import cvGridData from '../data/cv-pipeline/cv-grid-features.json';
import cvRocData from '../data/cv-pipeline/cv-roc-summary.json';

// Prepare chart data from scores
const chartData = cvScoresData.frames.map((f, i) => ({
  name: `F${i}`,
  frame: f.frame,
  water: +(f.water * 100).toFixed(1),
  vegetation: +(f.vegetation * 100).toFixed(1),
  shadow: +(f.shadow * 100).toFixed(1),
}));

// Compute KPIs
const avgWater = cvScoresData.frames.reduce((s, f) => s + f.water, 0) / cvScoresData.frames.length;
const avgVeg = cvScoresData.frames.reduce((s, f) => s + f.vegetation, 0) / cvScoresData.frames.length;
const avgShadow = cvScoresData.frames.reduce((s, f) => s + f.shadow, 0) / cvScoresData.frames.length;
const maxWater = Math.max(...cvScoresData.frames.map(f => f.water));
const highRiskCells = cvGridData.cells.filter(c => c.features.stagnant_water > 0.5).length;
const totalCells = cvGridData.cells.length;

// Grid heatmap helper
function getCellColor(value: number, type: 'water' | 'vegetation' | 'stagnant'): string {
  if (type === 'water') {
    if (value >= 0.7) return '#1e40af';
    if (value >= 0.5) return '#3b82f6';
    if (value >= 0.3) return '#93c5fd';
    return '#dbeafe';
  }
  if (type === 'vegetation') {
    if (value >= 0.7) return '#15803d';
    if (value >= 0.5) return '#22c55e';
    if (value >= 0.3) return '#86efac';
    return '#dcfce7';
  }
  // stagnant risk
  if (value >= 0.7) return '#dc2626';
  if (value >= 0.5) return '#f97316';
  if (value >= 0.3) return '#fbbf24';
  return '#fef3c7';
}

function getAucColor(auc: number): string {
  if (auc >= 0.9) return '#22c55e';
  if (auc >= 0.8) return '#3b82f6';
  if (auc >= 0.7) return '#f59e0b';
  return '#ef4444';
}

function getAucLabel(auc: number): string {
  if (auc >= 0.9) return 'Excellent';
  if (auc >= 0.8) return 'Good';
  if (auc >= 0.7) return 'Fair';
  return 'Poor';
}

// Grid heatmap component
function GridHeatmap({ type, title, icon: Icon }: { type: 'water' | 'vegetation' | 'stagnant'; title: string; icon: typeof Droplets }) {
  const gridSize = cvGridData.grid_size;
  const featureKey = type === 'stagnant' ? 'stagnant_water' : type;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div
        className="grid gap-[2px] mx-auto"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          maxWidth: 280,
        }}
      >
        {cvGridData.cells.map(cell => {
          const val = (cell.features as Record<string, number>)[featureKey] ?? 0;
          return (
            <div
              key={cell.cell_id}
              className="aspect-square rounded-[3px] cursor-pointer transition-transform hover:scale-110 hover:z-10 relative group"
              style={{ backgroundColor: getCellColor(val, type) }}
              title={`Cell ${cell.cell_id}: ${(val * 100).toFixed(0)}%`}
            >
              <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-20">
                {(val * 100).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-3 text-[10px] text-gray-500">
        <span>Low</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
            <div key={v} className="w-4 h-2 rounded-sm" style={{ backgroundColor: getCellColor(v, type) }} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

export function DroneAnalytics() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Camera className="w-7 h-7 text-indigo-600" />
              Drone CV Pipeline Analytics
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Computer vision analysis of drone survey: <span className="font-semibold">{cvScoresData.video_name}</span> • {cvScoresData.survey_date} • {cvScoresData.total_frames_extracted} frames
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-800">Pipeline Complete</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-100">Avg Water Score</p>
                <p className="text-2xl font-bold">{(avgWater * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-blue-200 mt-1">Peak: {(maxWater * 100).toFixed(0)}%</p>
              </div>
              <Droplets className="w-8 h-8 text-white opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-100">Avg Vegetation</p>
                <p className="text-2xl font-bold">{(avgVeg * 100).toFixed(0)}%</p>
              </div>
              <Trees className="w-8 h-8 text-white opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-200">Avg Shadow</p>
                <p className="text-2xl font-bold">{(avgShadow * 100).toFixed(0)}%</p>
              </div>
              <Moon className="w-8 h-8 text-white opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-100">High-Risk Cells</p>
                <p className="text-2xl font-bold">{highRiskCells}/{totalCells}</p>
                <p className="text-[10px] text-red-200 mt-1">Stagnant water &gt;50%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-white opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-100">Frames Analyzed</p>
                <p className="text-2xl font-bold">{cvScoresData.total_frames_extracted}</p>
                <p className="text-[10px] text-indigo-200 mt-1">Step: every {cvScoresData.sampling_step}th</p>
              </div>
              <Eye className="w-8 h-8 text-white opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-100">Grid Resolution</p>
                <p className="text-2xl font-bold">{cvGridData.grid_size}×{cvGridData.grid_size}</p>
                <p className="text-[10px] text-purple-200 mt-1">{totalCells} cells per frame</p>
              </div>
              <Activity className="w-8 h-8 text-white opacity-30" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Scores Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Feature Scores Across Frames</h3>
            <p className="text-xs text-gray-500 mb-4">Water, Vegetation & Shadow detection scores per sampled frame</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="water" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="Water" />
                <Area type="monotone" dataKey="vegetation" stroke="#16a34a" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} name="Vegetation" />
                <Area type="monotone" dataKey="shadow" stroke="#6b7280" fill="#9ca3af" fillOpacity={0.15} strokeWidth={2} name="Shadow" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Feature Distribution Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Frame-wise Feature Distribution</h3>
            <p className="text-xs text-gray-500 mb-4">Stacked view of detection percentages per frame</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="water" stackId="a" fill="#3b82f6" name="Water %" />
                <Bar dataKey="vegetation" stackId="a" fill="#22c55e" name="Vegetation %" />
                <Bar dataKey="shadow" stackId="a" fill="#9ca3af" name="Shadow %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grid Heatmaps */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            Spatial Feature Heatmaps
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {cvGridData.grid_size}×{cvGridData.grid_size} grid cell analysis from frame {cvGridData.frame_id} — hover cells for values
          </p>
          <div className="grid grid-cols-3 gap-6">
            <GridHeatmap type="water" title="Water Detection" icon={Droplets} />
            <GridHeatmap type="vegetation" title="Vegetation Density" icon={Trees} />
            <GridHeatmap type="stagnant" title="Stagnant Water Risk" icon={AlertTriangle} />
          </div>
        </div>

        {/* ROC/AUC + Frame Table row */}
        <div className="grid grid-cols-3 gap-6">
          {/* ROC Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Model Performance (ROC/AUC)</h3>
            <p className="text-xs text-gray-500 mb-4">Pipeline detection accuracy per feature</p>
            <div className="space-y-3">
              {cvRocData.features.map(f => (
                <div key={f.feature} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 capitalize">{f.feature}</span>
                      <span className="text-xs font-bold" style={{ color: getAucColor(f.auc) }}>
                        AUC: {f.auc.toFixed(2)} — {getAucLabel(f.auc)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${f.auc * 100}%`, backgroundColor: getAucColor(f.auc) }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] text-amber-700">
                ⚠ Ground truth: {cvRocData.ground_truth_source}
              </p>
            </div>
          </div>

          {/* Frame Scores Table */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Frame-by-Frame Scores</h3>
              <p className="text-xs text-gray-500 mb-3">All {cvScoresData.total_frames_extracted} sampled frames from the drone survey</p>
            </div>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Frame</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Water</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Vegetation</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Shadow</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Risk Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cvScoresData.frames.map((f, i) => {
                    const isHighWater = f.water >= 0.7;
                    return (
                      <tr key={i} className={`hover:bg-gray-50 ${isHighWater ? 'bg-red-50/50' : ''}`}>
                        <td className="px-4 py-2 text-gray-500">{i}</td>
                        <td className="px-4 py-2 font-mono text-gray-800">{f.frame}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 bg-gray-200 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${f.water * 100}%` }} />
                            </div>
                            <span className="text-gray-800 font-medium">{(f.water * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 bg-gray-200 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${f.vegetation * 100}%` }} />
                            </div>
                            <span className="text-gray-800 font-medium">{(f.vegetation * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 bg-gray-200 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-gray-400" style={{ width: `${f.shadow * 100}%` }} />
                            </div>
                            <span className="text-gray-800 font-medium">{(f.shadow * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {isHighWater ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3" /> HIGH WATER
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pipeline Info Footer */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
          <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            CV Pipeline Information
          </h3>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-gray-500">Detection Methods</p>
              <p className="font-medium text-gray-800">HSV Color + Texture (Laplacian)</p>
            </div>
            <div>
              <p className="text-gray-500">Object Detection</p>
              <p className="font-medium text-gray-800">YOLOv8 Nano (visual labels)</p>
            </div>
            <div>
              <p className="text-gray-500">Derived Features</p>
              <p className="font-medium text-gray-800">Water Proximity, Veg Density, Stagnant Water</p>
            </div>
            <div>
              <p className="text-gray-500">Export Formats</p>
              <p className="font-medium text-gray-800">CSV, GeoJSON, Grid JSON, Heatmap Images</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
