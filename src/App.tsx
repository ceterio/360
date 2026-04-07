/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Smartphone, 
  MousePointer2, 
  Loader2, 
  Maximize2, 
  ArrowLeft, 
  Flame, 
  Droplets, 
  Sun, 
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight
} from 'lucide-react';

// Declaration for Pannellum which will be loaded via CDN
declare global {
  interface Window {
    pannellum: any;
  }
}

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  icon: any;
  color: string;
}

const MENU_PANORAMA = "https://pannellum.org/images/alma.jpg";
const DEFAULT_360_IMAGE = "https://pannellum.org/images/jfk.jpg";

const SCENARIOS: Scenario[] = [
  {
    id: "incendios",
    title: "Incendios Forestales",
    subtitle: "España y Portugal bajo el fuego",
    image: "/360/images/incendios.png",
    icon: Flame,
    color: "from-orange-600 to-red-700",
  },
  {
    id: "desertificacion",
    title: "Desertificación",
    subtitle: "La degradación de las tierras secas",
    image: MENU_PANORAMA,
    icon: Sun,
    color: "from-yellow-600 to-orange-800",
  },
  {
    id: "inundaciones",
    title: "Inundaciones",
    subtitle: "El impacto de la DANA y el agua",
    image: MENU_PANORAMA,
    icon: Droplets,
    color: "from-blue-600 to-cyan-800",
  }
];

// Warming Stripes Palette
const STRIPE_COLORS = [
  '#08306b', '#08519c', '#2171b5', '#4292c6', '#6baed6', '#9ecae1', '#c6dbef', '#deebf7',
  '#f7fbff', '#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d',
  '#a50f15', '#67000d'
];

export default function App() {
  console.log("App component rendering...");
  const [viewState, setViewState] = useState<'menu' | 'viewer'>('menu');
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const viewerInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [gyroError, setGyroError] = useState<string | null>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Safety timeout: if it takes more than 10 seconds, show the menu anyway
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    // Wait for Pannellum to be available (it's now in index.html)
    const checkPannellum = setInterval(() => {
      if (window.pannellum) {
        clearInterval(checkPannellum);
        initViewer(MENU_PANORAMA, true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(checkPannellum);
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
      }
    };
  }, []);

  const initViewer = (panorama: string, autoRotate: boolean = false) => {
    if (!window.pannellum || !viewerRef.current) {
      setIsLoading(false);
      return;
    }

    try {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }

      // Clear the container just in case
      viewerRef.current.innerHTML = '';

      console.log("Initializing Pannellum with:", panorama);
      viewerInstance.current = window.pannellum.viewer(viewerRef.current, {
        type: "equirectangular",
        panorama: panorama,
        autoLoad: true,
        showControls: false,
        hfov: 100,
        pitch: 0,
        yaw: 0,
        mouseZoom: true,
        friction: 0.1,
        autoRotate: autoRotate ? -2 : 0,
        orientation: false
      });

      viewerInstance.current.on('load', () => {
        setIsLoading(false);
        setIsBackgroundLoading(false);
      });
      viewerInstance.current.on('error', (err: any) => {
        console.error("Pannellum error:", err);
        setLoadError(true);
        setIsLoading(false);
      });
    } catch (e) {
      console.error("Error initializing viewer:", e);
      setIsLoading(false);
    }
  };

  const startScenario = async (scenario: Scenario) => {
    setIsLoading(true);
    setLoadError(false);
    setCurrentScenario(scenario);
    setViewState('viewer');
    
    // Safety timeout for scenario loading
    const scenarioTimeout = setTimeout(() => {
      if (isLoading && viewState === 'viewer') {
        setIsLoading(false);
        setLoadError(true);
        backToMenu();
      }
    }, 10000);

    // Initialize viewer first
    initViewer(scenario.image, false);

    // Request gyro permission immediately since this is a user-initiated click
    const DeviceOrientationEvent = (window as any).DeviceOrientationEvent;
    if (DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          setTimeout(() => {
            if (viewerInstance.current) {
              viewerInstance.current.startOrientation();
              setGyroEnabled(true);
              clearTimeout(scenarioTimeout);
            }
          }, 500);
        }
      } catch (err) {
        console.error("Gyro permission error on start:", err);
      }
    } else if (DeviceOrientationEvent) {
      setTimeout(() => {
        if (viewerInstance.current) {
          viewerInstance.current.startOrientation();
          setGyroEnabled(true);
          clearTimeout(scenarioTimeout);
        }
      }, 500);
    }
  };

  const backToMenu = () => {
    setIsLoading(true);
    setLoadError(false);
    setViewState('menu');
    setCurrentScenario(null);
    setGyroEnabled(false);
    initViewer(MENU_PANORAMA, true);
  };

  const toggleGyro = () => {
    if (!viewerInstance.current) return;
    setGyroError(null);
    
    const enable = () => {
      try {
        viewerInstance.current.startOrientation();
        setGyroEnabled(true);
        // Dummy listener to "wake up" the API in some browsers
        window.addEventListener('deviceorientation', () => {}, { once: true });
      } catch (err) {
        console.error("Error starting orientation:", err);
        setGyroError("Error al activar sensores");
      }
    };

    const disable = () => {
      try {
        viewerInstance.current.stopOrientation();
        setGyroEnabled(false);
      } catch (err) {
        console.error("Error stopping orientation:", err);
      }
    };

    const DeviceOrientationEvent = (window as any).DeviceOrientationEvent;

    if (DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ logic
      DeviceOrientationEvent.requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            if (gyroEnabled) {
              disable();
            } else {
              enable();
            }
          } else {
            setGyroError("Permiso de sensores denegado");
          }
        })
        .catch((err: any) => {
          console.error("Permission request error:", err);
          setGyroError("Error al solicitar permisos");
        });
    } else if (DeviceOrientationEvent) {
      // Android or older iOS
      if (gyroEnabled) {
        disable();
      } else {
        enable();
      }
    } else {
      setGyroError("Giroscopio no disponible en este dispositivo");
    }
  };

  const toggleFullscreen = () => {
    if (viewerInstance.current) {
      viewerInstance.current.toggleFullscreen();
    }
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden font-sans text-white selection:bg-red-500/30">
      
      {/* PERSISTENT 360 VIEWER BACKGROUND */}
      <div ref={viewerRef} className="absolute inset-0 w-full h-full" id="panorama" />

      {/* MENU STATE OVERLAY */}
      <AnimatePresence mode="wait">
        {viewState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto bg-black/40 backdrop-blur-[2px]"
          >
            {/* Warming Stripes Background Overlay */}
            <div className="absolute inset-0 flex opacity-10 pointer-events-none">
              {STRIPE_COLORS.map((color, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
              ))}
            </div>

            <div className="max-w-4xl w-full relative z-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
                  <AlertTriangle className="w-3 h-3" /> Prueba 4: Crisis Climática
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6 leading-none drop-shadow-2xl">
                  Migraciones <span className="text-red-600">Climáticas</span>
                </h1>
                <p className="text-zinc-200 text-sm md:text-base leading-relaxed max-w-2xl mx-auto drop-shadow-lg font-medium">
                  En 2024, los desastres naturales provocaron el desplazamiento forzado de <span className="text-white font-bold underline decoration-red-500 underline-offset-4">45,8 millones de personas</span>, la mayor cifra jamás registrada. Explora los escenarios para descubrir las claves de esta crisis global.
                </p>
                
                {isBackgroundLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center justify-center gap-2 text-red-400 text-[10px] uppercase tracking-widest font-bold"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" /> Cargando entorno 360°...
                  </motion.div>
                )}
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SCENARIOS.map((s, idx) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    onClick={() => startScenario(s)}
                    className="group relative flex flex-col items-start p-8 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] hover:border-red-500/50 transition-all overflow-hidden text-left shadow-2xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-20 transition-opacity`} />
                    
                    {/* Stripe Accent for each card */}
                    <div className="absolute top-0 left-0 w-full h-1 flex opacity-40 group-hover:opacity-100 transition-opacity">
                      {STRIPE_COLORS.slice(idx * 6, (idx + 1) * 6).map((color, i) => (
                        <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>

                    <div className="relative z-10 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/5">
                        <s.icon className="w-6 h-6 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors">{s.title}</h3>
                      <p className="text-xs text-zinc-300 uppercase tracking-widest mb-6 font-medium">{s.subtitle}</p>
                      <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                        Explorar Escenario <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Bottom Warming Stripes Bar */}
            <div className="absolute bottom-0 left-0 w-full h-2 flex opacity-80">
              {STRIPE_COLORS.map((color, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
              ))}
            </div>

            {/* Loading Note */}
            <div className="absolute bottom-6 right-6 z-10 hidden md:flex items-center gap-2 text-[9px] uppercase tracking-widest text-zinc-500 font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <Info className="w-3 h-3 text-red-500" /> Las imágenes 360° pueden tardar unos segundos en cargar
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEWER STATE HUD */}
      <AnimatePresence>
        {viewState === 'viewer' && (
          <motion.div 
            key="viewer-hud"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Warming Stripes HUD Bar */}
            <div className="absolute top-0 left-0 w-full h-1 flex z-50 opacity-60">
              {STRIPE_COLORS.map((color, i) => (
                <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
              ))}
            </div>

            {/* Central Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="relative">
                <div className="w-6 h-6 border border-white/20 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-600 rounded-full shadow-[0_0_10px_#dc2626]" />
              </div>
            </div>

            {/* HUD - Top Bar */}
            <div className="absolute top-0 left-0 w-full p-6 pt-8 flex justify-between items-start z-40">
              <div className="flex gap-4 pointer-events-auto">
                <button 
                  onClick={backToMenu}
                  className="p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all shadow-2xl flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Volver</span>
                </button>
                
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                  <h2 className="text-sm font-bold tracking-tighter uppercase text-red-500 flex items-center gap-2">
                    {currentScenario?.icon && <currentScenario.icon className="w-4 h-4" />} {currentScenario?.title}
                  </h2>
                  <p className="text-[9px] opacity-60 uppercase tracking-widest mt-1 text-white">Exploración Visual</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 items-end pointer-events-auto">
                <button 
                  onClick={toggleGyro}
                  className={`p-4 rounded-2xl transition-all border shadow-2xl ${gyroEnabled ? 'bg-red-600 border-red-500 text-white' : 'bg-black/60 border-white/10 text-white hover:bg-white/10'}`}
                  title="Giroscopio"
                >
                  <Smartphone className="w-5 h-5" />
                </button>

                <button 
                  onClick={toggleFullscreen}
                  className="p-4 rounded-2xl bg-black/60 border border-white/10 text-white hover:bg-white/10 transition-all shadow-2xl"
                  title="Pantalla Completa"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* HUD - Bottom Instructions */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full px-6 flex flex-col items-center gap-4">
              <AnimatePresence>
                {gyroError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-red-600/90 backdrop-blur-md px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl"
                  >
                    <AlertTriangle className="w-3 h-3" /> {gyroError}
                  </motion.div>
                )}
                {!gyroEnabled && !gyroError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 border border-white/10"
                  >
                    <Smartphone className="w-3 h-3 text-red-500" /> Pulsa el icono del móvil para activar el giro
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] opacity-90 shadow-2xl pointer-events-auto">
                <span className="flex items-center gap-2"><MousePointer2 className="w-3 h-3 text-red-600" /> Arrastra para explorar</span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="opacity-60 text-white">Busca la información en la imagen</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950"
          >
            <div className="relative mb-8">
              <Loader2 className="w-16 h-16 animate-spin text-red-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-[0.3em] uppercase text-white mb-2">Cargando</h2>
            <div className="w-48 h-1 flex rounded-full overflow-hidden bg-white/10">
              {STRIPE_COLORS.map((color, i) => (
                <motion.div 
                  key={i} 
                  className="flex-1 h-full" 
                  style={{ backgroundColor: color }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                />
              ))}
            </div>
            <p className="mt-8 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
              {loadError ? "Error de conexión - Reintentando" : "Preparando entorno 360°"}
            </p>

            {viewState === 'viewer' && (
              <button 
                onClick={backToMenu}
                className="mt-12 px-6 py-2 rounded-full border border-white/10 text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors text-zinc-400"
              >
                Cancelar y volver
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .pnlm-container .pnlm-controls { display: none !important; }
        .pnlm-container .pnlm-load-button { display: none !important; }
        
        #panorama { cursor: grab; }
        #panorama:active { cursor: grabbing; }
      `}</style>
    </div>
  );
}
