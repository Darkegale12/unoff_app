import { Activity, AlertTriangle, BarChart3, Loader2, LogOut, Map, MapPin, Shield } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { mockHotspots } from '../data/mock-hotspots';
import { mockZones } from '../data/mock-zones';

const RiskMap = lazy(() => import('./RiskMap').then(m => ({ default: m.RiskMap })));
const LayerControl = lazy(() => import('./LayerControl').then(m => ({ default: m.LayerControl })));
const MapCenterControl = lazy(() => import('./MapCenterControl').then(m => ({ default: m.MapCenterControl })));
const BasemapToggle = lazy(() => import('./BasemapToggle').then(m => ({ default: m.BasemapToggle })));
const ZoneDetailPanel = lazy(() => import('./ZoneDetailPanel').then(m => ({ default: m.ZoneDetailPanel })));

// Only the lotus pond / MMCOE Hill zone
const DBT_ZONE_ID = 'pond-area';
const dbtZone = mockZones.filter(z => z.id === DBT_ZONE_ID);
const dbtHotspots = mockHotspots.filter(() => true); // show all hotspots near the area

function Loading({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{message}</p>
            </div>
        </div>
    );
}

export function DBTApp() {
    const { user, logout } = useAuth();
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [activeLayers, setActiveLayers] = useState<string[]>(['risk']);
    const [mapCenter, setMapCenter] = useState<[number, number]>([18.491292, 73.800823]);
    const [basemap, setBasemap] = useState<'streets' | 'satellite'>('streets');
    const [activeTab, setActiveTab] = useState<'map' | 'dashboard'>('map');

    const selectedZone = selectedZoneId
        ? dbtZone.find(z => z.id === selectedZoneId) || null
        : null;

    const zone = dbtZone[0];
    const lastUpdated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-md px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">DBT – Lotus Pond &amp; MMCOE Hill</h1>
                            <p className="text-xs text-gray-600">Restricted field view • Last updated: {lastUpdated}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {zone && (
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-bold text-red-700">HIGH RISK</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                                    <Activity className="w-4 h-4 text-red-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Cases</p>
                                        <p className="text-sm font-bold text-red-900">{zone.metrics.recentCases}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                                    <MapPin className="w-4 h-4 text-purple-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Traps</p>
                                        <p className="text-sm font-bold text-purple-900">{zone.metrics.trapCount}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">{user?.displayName}</span>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'map' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                    >
                        <Map className="w-5 h-5" /> Lotus Pond Map
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                    >
                        <BarChart3 className="w-5 h-5" /> Zone Analytics
                    </button>
                </div>
            </div>

            {activeTab === 'map' ? (
                <div className="flex-1 flex overflow-hidden">
                    <Suspense fallback={<div className="w-80 bg-white shadow-xl flex items-center justify-center"><Loading message="Loading controls..." /></div>}>
                        <div className="w-80 bg-white shadow-xl overflow-y-auto flex-shrink-0 z-10">
                            <LayerControl
                                activeLayers={activeLayers}
                                onLayerToggle={(layerId) => setActiveLayers(prev => prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId])}
                            />
                            <div className="p-4 border-t border-gray-200">
                                <MapCenterControl onCenterChange={(lat, lng) => setMapCenter([lat, lng])} />
                            </div>
                            <div className="p-4 border-t border-gray-200">
                                <BasemapToggle basemap={basemap} onBasemapChange={setBasemap} />
                            </div>
                            {/* DBT Zone Info */}
                            {zone && (
                                <div className="p-4 border-t border-gray-200">
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <p className="text-xs font-bold text-amber-800 mb-1">⚠ RESTRICTED ZONE VIEW</p>
                                        <p className="text-xs text-amber-700">Access limited to MMCOE Hill / Lotus Pond area only.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Suspense>

                    <div className="flex-1 relative">
                        <Suspense fallback={<Loading message="Loading map..." />}>
                            <RiskMap
                                zones={dbtZone}
                                hotspots={dbtHotspots}
                                selectedZone={selectedZoneId}
                                onZoneClick={setSelectedZoneId}
                                activeLayers={activeLayers}
                                center={mapCenter}
                                basemap={basemap}
                                currentStep={1}
                                onStepChange={() => {}}
                                showWater={false}
                                showVegetation={false}
                                showContainers={false}
                            />
                        </Suspense>
                    </div>

                    {selectedZone && (
                        <Suspense fallback={<div className="w-96 bg-white shadow-xl flex items-center justify-center"><Loading /></div>}>
                            <div className="w-96 bg-white shadow-xl overflow-y-auto flex-shrink-0 z-10">
                                <ZoneDetailPanel zone={selectedZone} onClose={() => setSelectedZoneId(null)} />
                            </div>
                        </Suspense>
                    )}
                </div>
            ) : (
                // Simple DBT Dashboard
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    {zone && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900">Lotus Pond / MMCOE Hill – Analytics</h2>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                                    <p className="text-sm text-gray-600">Recent Cases</p>
                                    <p className="text-3xl font-bold text-gray-900">{zone.metrics.recentCases}</p>
                                    <p className="text-xs text-red-600 mt-1">Trend: {zone.metrics.caseTrend}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                                    <p className="text-sm text-gray-600">Active Traps</p>
                                    <p className="text-3xl font-bold text-gray-900">{zone.metrics.trapCount}</p>
                                    <p className="text-xs text-gray-500 mt-1">Below recommended (6)</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                                    <p className="text-sm text-gray-600">Population at Risk</p>
                                    <p className="text-3xl font-bold text-gray-900">{zone.metrics.population.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">Residents in zone</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                                    <p className="text-sm text-gray-600">Temperature</p>
                                    <p className="text-3xl font-bold text-gray-900">{zone.metrics.temperature}°C</p>
                                    <p className="text-xs text-red-600 mt-1">High – favours breeding</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500">
                                    <p className="text-sm text-gray-600">Humidity</p>
                                    <p className="text-3xl font-bold text-gray-900">{zone.metrics.humidity}%</p>
                                    <p className="text-xs text-red-600 mt-1">High – vector-favourable</p>
                                </div>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-bold text-red-900 mb-2">Recommended Action</h3>
                                <p className="text-red-800 font-medium">{zone.recommendation.action}</p>
                                <p className="text-sm text-red-700 mt-2">{zone.recommendation.details}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="font-bold text-gray-900 mb-3">Risk Drivers</h3>
                                <div className="space-y-2">
                                    {zone.drivers.map((d, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.impact === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {d.impact.toUpperCase()}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{d.factor}</p>
                                                <p className="text-xs text-gray-500">Updated: {d.lastUpdated}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
