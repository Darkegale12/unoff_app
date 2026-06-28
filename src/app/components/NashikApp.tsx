import { Activity, AlertTriangle, BarChart3, Loader2, LogOut, Map, MapPin, Shield } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { nashikHotspots } from '../data/nashik-hotspots';
import { nashikZones } from '../data/nashik-zones';
import { getNashikHotspotsForDay, getNashikZonesForDay } from '../data/day-data-helpers';

const RiskMap = lazy(() => import('./RiskMap').then(m => ({ default: m.RiskMap })));
const LayerControl = lazy(() => import('./LayerControl').then(m => ({ default: m.LayerControl })));
const MapCenterControl = lazy(() => import('./MapCenterControl').then(m => ({ default: m.MapCenterControl })));
const BasemapToggle = lazy(() => import('./BasemapToggle').then(m => ({ default: m.BasemapToggle })));
const ZoneDetailPanel = lazy(() => import('./ZoneDetailPanel').then(m => ({ default: m.ZoneDetailPanel })));
const NashikDashboard = lazy(() => import('./NashikDashboard').then(m => ({ default: m.NashikDashboard })));

function Loading({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{message}</p>
            </div>
        </div>
    );
}

export function NashikApp() {
    const { user, logout } = useAuth();
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [activeLayers, setActiveLayers] = useState<string[]>(['risk']);
    const [mapCenter, setMapCenter] = useState<[number, number]>([20.0059, 73.7898]);
    const [basemap, setBasemap] = useState<'streets' | 'satellite'>('streets');
    const [activeTab, setActiveTab] = useState<'map' | 'dashboard'>('map');
    const [currentStep, setCurrentStep] = useState(1);

    const dayZones = getNashikZonesForDay(currentStep);
    const dayHotspots = getNashikHotspotsForDay(currentStep);

    const selectedZone = selectedZoneId
        ? dayZones.find(zone => zone.id === selectedZoneId) || null
        : null;

    const highRiskZones = dayZones.filter(z => z.riskLevel === 'high').length;
    const mediumRiskZones = dayZones.filter(z => z.riskLevel === 'medium').length;
    const lowRiskZones = dayZones.filter(z => z.riskLevel === 'low').length;
    const totalCases = dayZones.reduce((sum, z) => sum + z.metrics.recentCases, 0);
    const totalHotspots = dayHotspots.length;
    const highRiskHotspots = dayHotspots.filter(h => h.riskLevel === 'high').length;

    const lastUpdated = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
    });

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-100 flex flex-col">
            {/* Top Header */}
            <div className="bg-white shadow-md px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between max-w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Nashik – Vector Disease Control</h1>
                            <p className="text-xs text-gray-600">
                                Real-time risk assessment &amp; operational guidance • Last updated: {lastUpdated}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="text-xs text-gray-600">Risk Zones</p>
                                <div className="flex gap-2 items-baseline">
                                    <span className="text-sm font-bold text-red-600">{highRiskZones} High</span>
                                    <span className="text-sm font-bold text-yellow-600">{mediumRiskZones} Med</span>
                                    <span className="text-sm font-bold text-green-600">{lowRiskZones} Low</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-lg">
                            <Activity className="w-5 h-5 text-red-600" />
                            <div>
                                <p className="text-xs text-gray-600">Total Cases</p>
                                <p className="text-lg font-bold text-red-900">{totalCases}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 rounded-lg">
                            <MapPin className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="text-xs text-gray-600">Active Hotspots</p>
                                <div className="flex gap-2 items-baseline">
                                    <span className="text-lg font-bold text-purple-900">{totalHotspots}</span>
                                    <span className="text-xs text-red-600">({highRiskHotspots} High)</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
                            <span className="text-sm font-medium text-orange-800">{user?.displayName}</span>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
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
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'map' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
                    >
                        <Map className="w-5 h-5" />
                        Nashik Disease Prevention Map
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        Prevention Analytics
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'map' ? (
                <div className="flex-1 flex overflow-hidden">
                    <Suspense fallback={<div className="w-80 bg-white shadow-xl flex items-center justify-center"><Loading message="Loading controls..." /></div>}>
                        <div className="w-80 bg-white shadow-xl overflow-y-auto flex-shrink-0 z-10">
                            <LayerControl
                                activeLayers={activeLayers}
                                onLayerToggle={(layerId) => {
                                    setActiveLayers(prev =>
                                        prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
                                    );
                                }}
                            />
                            <div className="p-4 border-t border-gray-200">
                                <MapCenterControl onCenterChange={(lat, lng) => setMapCenter([lat, lng])} />
                            </div>
                            <div className="p-4 border-t border-gray-200">
                                <BasemapToggle basemap={basemap} onBasemapChange={setBasemap} />
                            </div>

                            {/* Kumbh / Godavari highlight notice */}
                            <div className="p-4 border-t border-gray-200">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <p className="text-xs font-bold text-orange-800 mb-1">🏕 Mahakumbh Zone – Panchavati</p>
                                    <p className="text-xs text-orange-700">
                                        Godavari river bank area. High-priority during Kumbhmela season. Emergency fogging deployed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Suspense>

                    <div className="flex-1 relative">
                        <Suspense fallback={<Loading message="Loading map..." />}>
                            <RiskMap
                                zones={dayZones}
                                hotspots={dayHotspots}
                                selectedZone={selectedZoneId}
                                onZoneClick={setSelectedZoneId}
                                activeLayers={activeLayers}
                                center={mapCenter}
                                basemap={basemap}
                                currentStep={currentStep}
                                onStepChange={setCurrentStep}
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
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<Loading message="Loading dashboard..." />}>
                        <NashikDashboard />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
