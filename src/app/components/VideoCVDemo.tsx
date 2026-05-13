import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Video, Droplets,
  Trees, Moon, AlertTriangle, Activity, Gauge, ChevronRight
} from 'lucide-react';
import cvScoresData from '../data/cv-pipeline/cv-scores.json';
import cvGridData from '../data/cv-pipeline/cv-grid-features.json';

const TOTAL_FRAMES = cvScoresData.frames.length;
const VIDEO_URL = '/data/videos/sample4.mp4';

function AnimatedGauge({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: typeof Droplets;
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const isHigh = pct >= 70;

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all duration-300 ${isHigh ? 'border-red-200 shadow-lg shadow-red-100/50' : 'border-gray-100 shadow-sm'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isHigh && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
          <span className="text-lg font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{ width: `${pct}%`, backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

function MiniHeatmap({ frameIndex, type }: { frameIndex: number; type: 'water' | 'vegetation' | 'stagnant' }) {
  const gridSize = cvGridData.grid_size;
  const featureKey = type === 'stagnant' ? 'stagnant_water' : type;

  const getColor = (val: number) => {
    if (type === 'water') {
      if (val >= 0.7) return '#1e40af';
      if (val >= 0.5) return '#3b82f6';
      if (val >= 0.3) return '#93c5fd';
      return '#dbeafe';
    }
    if (type === 'vegetation') {
      if (val >= 0.7) return '#15803d';
      if (val >= 0.5) return '#22c55e';
      if (val >= 0.3) return '#86efac';
      return '#dcfce7';
    }
    if (val >= 0.7) return '#dc2626';
    if (val >= 0.5) return '#f97316';
    if (val >= 0.3) return '#fbbf24';
    return '#fef3c7';
  };

  // Animate grid values based on frame index
  const animFactor = 0.8 + 0.4 * Math.sin((frameIndex / TOTAL_FRAMES) * Math.PI);

  return (
    <div>
      <div
        className="grid gap-[1px] mx-auto"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, maxWidth: 160 }}
      >
        {cvGridData.cells.map(cell => {
          const baseVal = (cell.features as Record<string, number>)[featureKey] ?? 0;
          const val = Math.min(1, baseVal * animFactor);
          return (
            <div
              key={cell.cell_id}
              className="aspect-square rounded-[2px] transition-colors duration-500"
              style={{ backgroundColor: getColor(val) }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function VideoCVDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<number | null>(null);

  const frameData = cvScoresData.frames[currentFrame] || cvScoresData.frames[0];

  // Sync video with frame
  const syncVideoToFrame = useCallback((frame: number) => {
    if (videoRef.current && videoRef.current.duration) {
      const videoDuration = videoRef.current.duration;
      videoRef.current.currentTime = (frame / TOTAL_FRAMES) * videoDuration;
    }
  }, []);

  // Play/Pause logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentFrame(prev => {
          const next = prev + 1;
          if (next >= TOTAL_FRAMES) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1500 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Sync video when frame changes
  useEffect(() => {
    syncVideoToFrame(currentFrame);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentFrame, isPlaying, syncVideoToFrame]);

  const handlePrevFrame = () => {
    setCurrentFrame(prev => Math.max(0, prev - 1));
  };

  const handleNextFrame = () => {
    setCurrentFrame(prev => Math.min(TOTAL_FRAMES - 1, prev + 1));
  };

  const togglePlay = () => setIsPlaying(prev => !prev);

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Video className="w-7 h-7 text-emerald-600" />
              Video CV Demo
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Drone survey playback with synchronized CV pipeline analysis
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs font-medium text-emerald-800">
              {isPlaying ? 'Live Analysis' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-5 gap-6">
          {/* Left: Video + Controls (3 cols) */}
          <div className="col-span-3 space-y-4">
            {/* Video Player */}
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
              <video
                ref={videoRef}
                src={VIDEO_URL}
                className="w-full aspect-video"
                muted
                playsInline
                preload="auto"
              />
            </div>

            {/* Playback Controls */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevFrame}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  disabled={currentFrame === 0}
                >
                  <SkipBack className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-lg shadow-emerald-200"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleNextFrame}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  disabled={currentFrame >= TOTAL_FRAMES - 1}
                >
                  <SkipForward className="w-4 h-4 text-gray-700" />
                </button>

                <div className="flex-1 mx-2">
                  <input
                    type="range"
                    min={0}
                    max={TOTAL_FRAMES - 1}
                    value={currentFrame}
                    onChange={(e) => setCurrentFrame(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: '#059669' }}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Frame 0</span>
                    <span>Frame {TOTAL_FRAMES - 1}</span>
                  </div>
                </div>

                {/* Frame Counter */}
                <div className="text-center px-3 py-1.5 bg-gray-900 text-white rounded-lg min-w-[80px]">
                  <p className="text-[10px] text-gray-400 leading-none">FRAME</p>
                  <p className="text-lg font-mono font-bold leading-tight">{currentFrame + 1}/{TOTAL_FRAMES}</p>
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-gray-500" />
                  {[0.5, 1, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${playbackSpeed === speed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Frame Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Current Frame Analysis</h3>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-mono text-gray-500">{frameData.frame}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <AnimatedGauge label="Water" value={frameData.water} color="#2563eb" icon={Droplets} />
                <AnimatedGauge label="Vegetation" value={frameData.vegetation} color="#16a34a" icon={Trees} />
                <AnimatedGauge label="Shadow" value={frameData.shadow} color="#6b7280" icon={Moon} />
              </div>
            </div>
          </div>

          {/* Right: Live Data Panel (2 cols) */}
          <div className="col-span-2 space-y-4">
            {/* Pipeline Status */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                <span className="text-sm font-semibold">CV Pipeline Status</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400">Video</p>
                  <p className="text-sm font-mono font-semibold text-emerald-300">{cvScoresData.video_name}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400">Survey Date</p>
                  <p className="text-sm font-mono font-semibold text-blue-300">{cvScoresData.survey_date}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400">Sampling</p>
                  <p className="text-sm font-semibold text-yellow-300">Every {cvScoresData.sampling_step}th frame</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400">Total Frames</p>
                  <p className="text-sm font-semibold text-purple-300">{cvScoresData.total_frames_extracted}</p>
                </div>
              </div>
            </div>

            {/* Detection Alert */}
            {frameData.water >= 0.7 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-pulse-subtle">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-bold text-red-800">⚠ High Water Detected</span>
                </div>
                <p className="text-xs text-red-700">
                  Frame {currentFrame + 1} shows {(frameData.water * 100).toFixed(0)}% water coverage —
                  potential stagnant water breeding site.
                </p>
              </div>
            )}

            {/* Mini Heatmaps */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Spatial Grid Analysis
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <MiniHeatmap frameIndex={currentFrame} type="water" />
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">Water</p>
                </div>
                <div className="text-center">
                  <MiniHeatmap frameIndex={currentFrame} type="vegetation" />
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">Vegetation</p>
                </div>
                <div className="text-center">
                  <MiniHeatmap frameIndex={currentFrame} type="stagnant" />
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">Stagnant Risk</p>
                </div>
              </div>
            </div>

            {/* Frame History Mini-Chart */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Frame History</h3>
              <div className="flex items-end gap-[3px] h-24">
                {cvScoresData.frames.map((f, i) => {
                  const isActive = i === currentFrame;
                  const isPast = i < currentFrame;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col gap-[1px] cursor-pointer transition-all"
                      style={{ opacity: isPast ? 1 : isActive ? 1 : 0.3 }}
                      onClick={() => setCurrentFrame(i)}
                    >
                      <div
                        className="rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${f.water * 80}px`,
                          backgroundColor: isActive ? '#1d4ed8' : '#93c5fd',
                        }}
                      />
                      <div
                        className="transition-all duration-300"
                        style={{
                          height: `${f.vegetation * 40}px`,
                          backgroundColor: isActive ? '#15803d' : '#86efac',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-gray-400">
                <span>F0</span>
                <span>F{Math.floor(TOTAL_FRAMES / 2)}</span>
                <span>F{TOTAL_FRAMES - 1}</span>
              </div>
            </div>

            {/* Pipeline Info */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
              <h4 className="text-xs font-bold text-indigo-900 mb-2">Detection Pipeline</h4>
              <div className="space-y-1.5 text-[11px] text-indigo-700">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-medium">HSV Color + Texture</span>
                </div>
                <div className="flex justify-between">
                  <span>Object Model</span>
                  <span className="font-medium">YOLOv8 Nano</span>
                </div>
                <div className="flex justify-between">
                  <span>Grid</span>
                  <span className="font-medium">{cvGridData.grid_size}×{cvGridData.grid_size}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-pulse-subtle {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
