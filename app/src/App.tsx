import { useState, useMemo } from 'react';
import { fmtDir } from './utils/routes';
import { useTheme } from './hooks/useTheme';
import { usePersistedLocation } from './hooks/usePersistedLocation';
import { useUsageLog } from './hooks/useUsageLog';
import { useNearbyBuses } from './hooks/useNearbyBuses';
import { useSuggestionsLive } from './hooks/useSuggestionsLive';
import { useTracking } from './hooks/useTracking';
import { LocationIcon } from './components/Icons';
import MapView from './components/MapView';
import SearchOverlay from './components/SearchOverlay';
import HomeSheet from './components/HomeSheet';
import TrackingSheet from './components/TrackingSheet';
import ScheduleSheet from './components/ScheduleSheet';
import FloatBar from './components/FloatBar';
import PinBanner from './components/PinBanner';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ═══════════════════════════════════════════
// APP
// ═══════════════════════════════════════════
export default function App() {
  // ─── Dev mode: ?dev=1 in URL allows dragging location + pin mode ───
  const devMode = useMemo(() => new URLSearchParams(window.location.search).has('dev'), []);

  // ─── Core hooks ───
  const { theme, toggle: toggleTheme } = useTheme();
  const { position: savedLoc, saveLocation } = usePersistedLocation(devMode);
  const { logUsage, suggestions, recentLines } = useUsageLog(savedLoc);

  // ─── Nearby live buses ───
  const { nearbyBuses } = useNearbyBuses(savedLoc);

  // ─── Live data for suggestions ───
  const { suggestionsLive } = useSuggestionsLive(suggestions, savedLoc);

  // ─── Tracking (all tracking state + actions) ───
  const {
    tracked, vehicles, stops, routeCoords, walkRoute,
    closestStop, selectedStop, schedule,
    opColor, showDirPicker, fitCoords, fitTrigger,
    liveEta, liveStopsAway, walkMin, walkDist,
    startTracking, openSchedule, goHome: resetTracking,
    setShowDirPicker, setSelectedStop,
    loading, loadingMsg,
  } = useTracking(savedLoc, logUsage);

  // ─── Local UI state ───
  const [view, setView] = useState('home'); // home | search | tracking | schedule
  const [pinMode, setPinMode] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [flyToTrigger, setFlyToTrigger] = useState(0);

  // ─── Navigation wrappers ───
  function handleStartTracking(lineName, lineRefs, agencyName, dirFrom?, dirTo?, siblings?) {
    setView('tracking');
    startTracking(lineName, lineRefs, agencyName, dirFrom, dirTo, siblings);
  }
  function handleOpenSchedule(stop) {
    setView('schedule');
    openSchedule(stop);
  }
  function goHome() {
    resetTracking();
    setView('home');
  }
  function goSearch() {
    setView('search');
  }


  // ═══════════ RENDER ═══════════
  return (
    <div className="app">
      {/* ── MAP ── */}
      <MapView
        theme={theme} view={view} savedLoc={savedLoc} devMode={devMode} pinMode={pinMode}
        fitCoords={fitCoords} fitTrigger={fitTrigger} flyToTrigger={flyToTrigger}
        routeCoords={routeCoords} opColor={opColor}
        stops={stops} closestStop={closestStop} selectedStop={selectedStop}
        vehicles={vehicles} tracked={tracked} walkRoute={walkRoute}
        onPin={(lat, lon) => { setPinMode(false); saveLocation(lat, lon); }}
        onMapTap={() => { if (view === 'schedule') { setSelectedStop(null); setView('tracking'); } }}
        onStopClick={handleOpenSchedule}
        onDragEnd={(lat, lon) => saveLocation(lat, lon)}
      />

      {/* ── FLOATING BAR ── */}
      {view !== 'search' && view !== 'schedule' && (
        tracked ? (
          <FloatBar mode="tracking" theme={theme} lineName={tracked.lineName}
            directionText={tracked.from ? fmtDir(tracked.from, tracked.to) : tracked.agencyName}
            operatorColor={opColor} onBack={goHome} onToggleTheme={toggleTheme} />
        ) : (
          <FloatBar mode="home" theme={theme} onSearch={goSearch} onToggleTheme={toggleTheme} onLocate={() => setFlyToTrigger(t => t + 1)} />
        )
      )}


      {/* ── LOCATION FAB ── */}
      <button className="location-fab" onClick={() => {
        // If we have a location, just fly to it
        if (savedLoc) {
          setFlyToTrigger(t => t + 1);
          // Silently update GPS in background (not in dev mode)
          if (!devMode) navigator.geolocation?.getCurrentPosition(
            pos => saveLocation(pos.coords.latitude, pos.coords.longitude),
            () => {}, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
          return;
        }
        // No saved location — try GPS, fallback to pin mode
        setLocError(null);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              setLocError(null);
              saveLocation(pos.coords.latitude, pos.coords.longitude);
              setFlyToTrigger(t => t + 1);
            },
            (err) => {
              const msgs = {
                1: 'הגישה למיקום נדחתה. יש לאשר בהגדרות הדפדפן',
                2: 'לא ניתן לזהות מיקום',
                3: 'זמן המתנה למיקום עבר',
              };
              setLocError(msgs[err.code] || `שגיאה: ${err.message}`);
              if (devMode) setPinMode(true);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
        } else {
          setLocError('הדפדפן לא תומך במיקום');
          if (devMode) setPinMode(true);
        }
      }}>
        <LocationIcon size={20} color="var(--text1)" />
      </button>

      {/* ── PIN BANNER ── */}
      {pinMode && <PinBanner locError={locError} onCancel={() => { setPinMode(false); setLocError(null); }} />}

      {/* ── LOADING ── */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>{loadingMsg}</div>
        </div>
      )}

      {/* ── SEARCH OVERLAY ── */}
      {view === 'search' && (
        <SearchOverlay
          suggestions={suggestions}
          recentLines={recentLines}
          onTrackLine={handleStartTracking}
          onClose={goHome}
        />
      )}

      {/* ── BOTTOM SHEET ── */}
      {view !== 'search' && (
      <div className={`bottom-sheet ${view === 'schedule' ? 'full' : tracked ? 'peek' : 'half'}`}>
        <div className="sheet-handle-area" onDoubleClick={() => {
          if (window.confirm('Clear all data? (dev)')) {
            localStorage.clear();
            window.location.reload();
          }
        }}><div className="sheet-handle" /></div>
        <div className="sheet-content">

          {view === 'home' && (
            <HomeSheet
              suggestions={suggestions}
              suggestionsLive={suggestionsLive}
              nearbyBuses={nearbyBuses}
              recentLines={recentLines}
              fmtDir={fmtDir}
              onTrackLine={handleStartTracking}
              onSearch={goSearch}
            />
          )}

          {view === 'tracking' && (
            <TrackingSheet
              tracked={tracked}
              closestStop={closestStop}
              vehicles={vehicles}
              liveEta={liveEta}
              liveStopsAway={liveStopsAway}
              walkMin={walkMin}
              walkDist={walkDist}
              showDirPicker={showDirPicker}
              fmtDir={fmtDir}
              onToggleDirPicker={() => tracked?.siblings?.length > 1 && setShowDirPicker(!showDirPicker)}
              onSwapDirection={() => {
                const current = tracked?.siblings?.find(s => s.lineRef === tracked.lineRefs[0]);
                if (!current) return;
                let mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef && s.alternative === current.alternative && s.direction !== current.direction);
                if (!mirror) mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef && s.alternative === current.alternative);
                if (!mirror) mirror = tracked.siblings.find(s => s.lineRef !== current.lineRef);
                if (mirror) handleStartTracking(tracked.lineName, [mirror.lineRef], tracked.agencyName, mirror.from, mirror.to, tracked.siblings);
              }}
              onPickDirection={(s) => { setShowDirPicker(false); if (s.lineRef !== tracked?.lineRefs?.[0]) handleStartTracking(tracked.lineName, [s.lineRef], tracked.agencyName, s.from, s.to, tracked.siblings); }}
              onOpenSchedule={handleOpenSchedule}
            />
          )}

          {view === 'schedule' && selectedStop && (
            <ScheduleSheet
              selectedStop={selectedStop}
              tracked={tracked}
              schedule={schedule}
              opColor={opColor}
              walkMin={walkMin}
              onClose={() => { setSelectedStop(null); setView('tracking'); }}
            />
          )}

        </div>
      </div>
      )}
    </div>
  );
}
