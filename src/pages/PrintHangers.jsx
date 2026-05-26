import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Square, MapPin, Trash2, Package, Pause, PlayCircle, Tag, Signal, X, User, Plus, Pencil, MapIcon, Check, UserCircle } from 'lucide-react';
import { useAppStore } from '../store/AppStoreContext';
import { useAuth } from '../contexts/AuthContext';

// Rock Hill, SC — default center
const DEFAULT_CENTER = [34.9249, -81.0251];
const DEFAULT_ZOOM = 14;
const ACTIVE_TRIP_KEY = 'boost-hangers-active-trip';

function uid() { return Math.random().toString(36).slice(2, 9); }

// Persistent active-trip snapshot. Survives page refresh, nav-away, accidental tab close.
function loadActive() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_TRIP_KEY) || 'null'); } catch { return null; }
}
function saveActive(state) {
  try {
    if (state) localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(state));
    else localStorage.removeItem(ACTIVE_TRIP_KEY);
  } catch { /* quota */ }
}

// Auto-fit map to all known points on first load.
function FitBounds({ allPoints, active }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (active) return; // never re-fit while tracking
    if (fittedRef.current) return;
    if (!allPoints || allPoints.length < 2) return;
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    fittedRef.current = true;
  }, [allPoints, active, map]);
  return null;
}

// Click-to-add-vertex handler used while drawing an area polygon.
function DrawClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

// Ray-casting point-in-polygon. polygon = [[lat,lng], ...]
function pointInPolygon([lat, lng], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersect = ((lngI > lng) !== (lngJ > lng)) &&
      (lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Polygon area in square meters using the spherical excess formula (good enough for small polygons).
function polygonAreaSqM(polygon) {
  if (!polygon || polygon.length < 3) return 0;
  const R = 6378137;
  let total = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[(i + 1) % n];
    total += ((lng2 - lng1) * Math.PI / 180) * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
  }
  return Math.abs(total * R * R / 2);
}

// Count residences inside a polygon by querying the York County SC address database.
// This is the authoritative source (the County Tax Assessor) — each result is a real
// physical address. Falls back to OSM if the area is outside York County.
async function countBuildingsInPolygon(polygon) {
  if (!polygon || polygon.length < 3) return { count: 0, source: 'york-county' };

  // ArcGIS expects rings in [lng, lat] order, with the ring closed.
  const ring = polygon.map(([lat, lng]) => [lng, lat]);
  if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push(ring[0]);
  }
  const geometry = JSON.stringify({ rings: [ring], spatialReference: { wkid: 4326 } });

  // Try York County SC address layer first — exact count of real addresses.
  try {
    const url = `https://services1.arcgis.com/2AGLxyiJoNiVHKwq/arcgis/rest/services/Addresses/FeatureServer/0/query?where=1%3D1&geometry=${encodeURIComponent(geometry)}&geometryType=esriGeometryPolygon&spatialRel=esriSpatialRelIntersects&inSR=4326&returnCountOnly=true&f=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number') {
        return { count: data.count, source: 'york-county' };
      }
    }
  } catch { /* fall through */ }

  // Outside York County or service down — fall back to OSM addresses + buildings.
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  for (const [lat, lng] of polygon) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }
  const query = `
    [out:json][timeout:30];
    (
      node["addr:housenumber"](${south},${west},${north},${east});
      way["addr:housenumber"](${south},${west},${north},${east});
      way["building"](${south},${west},${north},${east});
    );
    out center;
  `;
  let addrCount = 0;
  let bldgCount = 0;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });
    if (res.ok) {
      const data = await res.json();
      for (const el of data.elements || []) {
        const c = el.center || (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
        if (!c) continue;
        if (!pointInPolygon([c.lat, c.lon], polygon)) continue;
        if (el.tags?.['addr:housenumber']) addrCount++;
        else if (el.tags?.building) bldgCount++;
      }
    }
  } catch { /* fall through to estimate */ }

  const osmCount = Math.max(addrCount, bldgCount);
  if (osmCount > 0) return { count: osmCount, source: 'osm' };

  // Last resort: density estimate.
  const areaM2 = polygonAreaSqM(polygon);
  const estimate = Math.round(areaM2 * (1.2 / 4046.86));
  return { count: estimate, source: 'estimate' };
}

// Center on rep's current location while a trip is active.
function FollowMe({ point }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.setView(point, Math.max(map.getZoom(), 17), { animate: true });
  }, [point, map]);
  return null;
}

export default function PrintHangers() {
  const trips = useAppStore((s) => s.hangerTrips) || [];
  const setTrips = useAppStore((s) => s.setHangerTrips);
  const areas = useAppStore((s) => s.hangerAreas) || [];
  const setAreas = useAppStore((s) => s.setHangerAreas);
  const { user, currentUser } = useAuth();
  // Whoever's signed in gets attached as the person who did the hanging.
  const doneBy = currentUser || user?.email || null;

  // Active trip state — restored from localStorage so refresh doesn't kill the trip.
  const restored = useRef(loadActive());
  const [activeTripId, setActiveTripId] = useState(restored.current?.id || null);
  const [livePath, setLivePath] = useState(restored.current?.path || []);
  const [startedAt, setStartedAt] = useState(restored.current?.startedAt || null);
  const [paused, setPaused] = useState(restored.current?.paused || false);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [packs, setPacks] = useState('');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [, forceTick] = useState(0);

  // Area drawing state
  const [drawMode, setDrawMode] = useState(false);
  const [draftPolygon, setDraftPolygon] = useState([]); // [[lat,lng], ...]
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaAssignee, setAreaAssignee] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [buildingCount, setBuildingCount] = useState(null); // null=loading, number=done, false=error
  const [locationPermission, setLocationPermission] = useState('unknown'); // unknown | granted | prompt | denied

  // Check geolocation permission state on mount + react to changes.
  useEffect(() => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setLocationPermission('unknown');
      return;
    }
    let cancelled = false;
    let status = null;
    navigator.permissions.query({ name: 'geolocation' }).then((s) => {
      if (cancelled) return;
      status = s;
      setLocationPermission(s.state);
      s.addEventListener('change', () => setLocationPermission(s.state));
    }).catch(() => setLocationPermission('unknown'));
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  // Ask now — fires the browser prompt. Used for the "Enable Location" button.
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocationPermission('granted'),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationPermission('denied');
        setError(err.message || 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const watchRef = useRef(null);
  const wakeLockRef = useRef(null);

  const isTracking = !!activeTripId;

  // Tick every second while tracking so the live timer keeps moving even when GPS is idle.
  useEffect(() => {
    if (!isTracking || paused) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isTracking, paused]);

  // Persist active state on every change so refresh restores it.
  useEffect(() => {
    if (!isTracking) { saveActive(null); return; }
    saveActive({ id: activeTripId, path: livePath, startedAt, paused });
  }, [isTracking, activeTripId, livePath, startedAt, paused]);

  // Watch position — start/stop based on tracking + paused state.
  useEffect(() => {
    if (!isTracking || paused) {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setAccuracy(pos.coords.accuracy);
        setError(null);
        setCurrentPoint(p);
        setLivePath((path) => {
          // Skip near-duplicates so line stays smooth.
          if (path.length === 0) return [p];
          const last = path[path.length - 1];
          const meters = haversine(last, p);
          if (meters < 3) return path; // standing still
          // Skip junk GPS jumps (>200m between fixes = unrealistic at walking pace)
          if (meters > 200) return path;
          return [...path, p];
        });
      },
      (err) => setError(err.message || 'Could not get location'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [isTracking, paused]);

  // Keep screen awake while tracking (mobile).
  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      if (!isTracking || paused) return;
      if (!('wakeLock' in navigator)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) { lock.release(); return; }
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => { wakeLockRef.current = null; });
      } catch { /* user denied or unsupported */ }
    };
    acquire();
    // Re-acquire on visibility change (browsers auto-release when tab hidden)
    const onVis = () => {
      if (document.visibilityState === 'visible' && isTracking && !paused && !wakeLockRef.current) acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
    };
  }, [isTracking, paused]);

  const startTrip = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      return;
    }
    if (locationPermission === 'denied') {
      setError('Location permission is blocked. Enable it in your browser settings for this site.');
      return;
    }
    // Trigger the browser prompt up-front before starting; only begin trip once granted.
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission('granted');
        setActiveTripId(uid());
        setLivePath([]);
        setStartedAt(Date.now());
        setPaused(false);
        setCurrentPoint(null);
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocationPermission('denied');
        setError(err.message || 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locationPermission]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  const requestEnd = useCallback(() => {
    setShowEndModal(true);
  }, []);

  const discardActive = useCallback(() => {
    setActiveTripId(null);
    setLivePath([]);
    setStartedAt(null);
    setPaused(false);
    setCurrentPoint(null);
    setAccuracy(null);
    setShowEndModal(false);
    setPacks('');
    saveActive(null);
  }, []);

  const saveTrip = useCallback(() => {
    const n = parseInt(packs, 10);
    const finalPacks = Number.isFinite(n) && n > 0 ? n : 0;
    const newTrip = {
      id: activeTripId,
      startedAt: startedAt || Date.now() - livePath.length * 1000,
      endedAt: Date.now(),
      path: livePath,
      packs: finalPacks,
      doneBy: doneBy || null,
    };
    setTrips([...(trips || []), newTrip]);
    discardActive();
  }, [packs, doneBy, activeTripId, startedAt, livePath, trips, setTrips, discardActive]);

  const deleteTrip = (id) => {
    if (!confirm('Delete this trip?')) return;
    setTrips(trips.filter((t) => t.id !== id));
    if (selectedTripId === id) setSelectedTripId(null);
  };

  const allPoints = useMemo(() => {
    const pts = [];
    for (const t of trips) pts.push(...(t.path || []));
    for (const p of livePath) pts.push(p);
    return pts;
  }, [trips, livePath]);

  const selectedTrip = selectedTripId ? trips.find((t) => t.id === selectedTripId) : null;
  const selectedArea = selectedAreaId ? areas.find((a) => a.id === selectedAreaId) : null;

  const startDrawing = () => {
    setDraftPolygon([]);
    setDrawMode(true);
    setSelectedAreaId(null);
  };
  const cancelDrawing = () => {
    setDrawMode(false);
    setDraftPolygon([]);
  };
  const [buildingSource, setBuildingSource] = useState(null); // 'osm' | 'estimate' | null
  const finishDrawing = () => {
    if (draftPolygon.length < 3) return;
    setShowAreaModal(true);
    setBuildingCount(null);
    setBuildingSource(null);
    countBuildingsInPolygon(draftPolygon)
      .then(({ count, source }) => { setBuildingCount(count); setBuildingSource(source); })
      .catch(() => setBuildingCount(false));
  };
  const saveArea = () => {
    const newArea = {
      id: uid(),
      name: areaName.trim() || `Area ${areas.length + 1}`,
      polygon: draftPolygon,
      assignedTo: areaAssignee.trim() || null,
      houseCount: typeof buildingCount === 'number' ? buildingCount : null,
      houseCountSource: buildingSource,
      createdAt: Date.now(),
    };
    setAreas([...areas, newArea]);
    setShowAreaModal(false);
    setDrawMode(false);
    setDraftPolygon([]);
    setAreaName('');
    setAreaAssignee('');
  };
  const deleteArea = (id) => {
    if (!confirm('Delete this area?')) return;
    setAreas(areas.filter((a) => a.id !== id));
    if (selectedAreaId === id) setSelectedAreaId(null);
  };

  // For existing areas missing a count: trigger a fetch and write back to the store.
  const [recountStatus, setRecountStatus] = useState({}); // { [areaId]: 'loading' | 'error' }
  const countBuildingsForArea = useCallback(async (area) => {
    setRecountStatus((s) => ({ ...s, [area.id]: 'loading' }));
    try {
      const { count, source } = await countBuildingsInPolygon(area.polygon);
      setAreas(areas.map((a) => a.id === area.id ? { ...a, houseCount: count, houseCountSource: source } : a));
      setRecountStatus((s) => { const next = { ...s }; delete next[area.id]; return next; });
    } catch {
      setRecountStatus((s) => ({ ...s, [area.id]: 'error' }));
    }
  }, [areas, setAreas]);

  // Auto-recount if the selected area has no count, or was counted with the
  // older OSM-only logic (no houseCountSource field) which often returned 1.
  useEffect(() => {
    if (!selectedArea) return;
    if (selectedArea.houseCount != null && selectedArea.houseCountSource) return;
    if (recountStatus[selectedArea.id]) return;
    countBuildingsForArea(selectedArea);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreaId]);

  // 12-week histogram of hangers dropped.
  const weeks = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff); // Monday of this week
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const s = new Date(start);
      s.setDate(s.getDate() - i * 7);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      buckets.push({ start: s.getTime(), end: e.getTime(), packs: 0, trips: 0, label: `${s.getMonth() + 1}/${s.getDate()}` });
    }
    for (const t of trips) {
      const when = t.endedAt || t.startedAt || 0;
      for (const b of buckets) {
        if (when >= b.start && when < b.end) {
          b.packs += t.packs || 0;
          b.trips++;
          break;
        }
      }
    }
    return buckets;
  }, [trips]);
  const weekMax = Math.max(1, ...weeks.map((w) => w.packs));

  return (
    <div className="pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Door Hangers</h1>
          <p className="text-sm text-tertiary font-semibold mt-1">Track every street you've walked. Never repeat territory.</p>
        </div>
        {isTracking && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider">
            <span className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`} />
            {paused ? 'Paused' : 'Live'}
          </span>
        )}
      </div>

      {/* 12-week hangers histogram */}
      <div className="rounded-3xl border border-card-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Hangers per week · last 12 weeks</p>
          <p className="text-xs font-bold text-tertiary">{trips.reduce((s, t) => s + (t.packs || 0), 0)} all-time</p>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {weeks.map((w, i) => {
            const isCurrent = i === weeks.length - 1;
            const h = Math.max(4, Math.round((w.packs / weekMax) * 120));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className={`text-[10px] font-bold ${w.packs > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'} text-tertiary`}>
                  {w.packs}
                </span>
                <div
                  className={`w-full rounded-md ${isCurrent ? 'bg-primary' : 'bg-surface-alt border border-card-border'}`}
                  style={{ height: `${h}px` }}
                  title={`Week of ${w.label}: ${w.packs} hangers · ${w.trips} trip${w.trips === 1 ? '' : 's'}`}
                />
                <span className="text-[9px] font-bold text-tertiary truncate">{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-3xl overflow-hidden border border-card-border bg-card" style={{ height: 480 }}>
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} maxZoom={19} style={{ height: '100%', width: '100%' }}>
          {/* Esri World Imagery — satellite. Free, no API key. */}
          <TileLayer
            attribution='Imagery &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          {/* Transparent street + label overlay so you can still read road names */}
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          {/* All past trips — muted green; selected one highlighted */}
          {trips.map((t) => {
            const isSelected = t.id === selectedTripId;
            return (
              <Polyline
                key={t.id}
                positions={t.path || []}
                pathOptions={{
                  color: isSelected ? '#16a34a' : '#15803d',
                  weight: isSelected ? 7 : 5,
                  opacity: isSelected ? 1 : (selectedTripId ? 0.25 : 0.7),
                }}
                eventHandlers={{ click: () => setSelectedTripId(t.id) }}
              >
                <Tooltip sticky>{formatDefaultName(t.startedAt)} · {t.packs || 0} hangers · {formatDuration((t.endedAt || 0) - (t.startedAt || 0))}{t.doneBy ? ` · ${t.doneBy}` : ''}</Tooltip>
              </Polyline>
            );
          })}
          {/* Live trip */}
          {livePath.length > 1 && (
            <Polyline positions={livePath} pathOptions={{ color: '#f59e0b', weight: 6, opacity: 0.95 }} />
          )}
          {isTracking && currentPoint && (
            <CircleMarker center={currentPoint} radius={7} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1 }} />
          )}
          <FitBounds allPoints={allPoints} active={isTracking} />
          {isTracking && currentPoint && <FollowMe point={currentPoint} />}

          {/* Saved areas */}
          {areas.map((a) => {
            const isSel = a.id === selectedAreaId;
            return (
              <Polygon
                key={a.id}
                positions={a.polygon}
                pathOptions={{
                  color: isSel ? '#2563eb' : '#3b82f6',
                  weight: isSel ? 3 : 2,
                  fillOpacity: isSel ? 0.25 : 0.12,
                  fillColor: '#3b82f6',
                }}
                eventHandlers={{ click: () => setSelectedAreaId(a.id) }}
              >
                <Tooltip sticky>{a.name}{a.assignedTo ? ` · ${a.assignedTo}` : ''}</Tooltip>
              </Polygon>
            );
          })}
          {/* Draft polygon being drawn */}
          {drawMode && draftPolygon.length > 0 && (
            <>
              <Polygon
                positions={draftPolygon}
                pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.18, dashArray: '6,6' }}
              />
              {draftPolygon.map((p, i) => (
                <CircleMarker key={i} center={p} radius={5} pathOptions={{ color: '#3b82f6', fillColor: '#fff', fillOpacity: 1, weight: 2 }} />
              ))}
            </>
          )}
          {/* Map click handler — only active in draw mode */}
          {drawMode && (
            <DrawClickHandler
              onClick={(latlng) => setDraftPolygon((p) => [...p, [latlng.lat, latlng.lng]])}
            />
          )}
        </MapContainer>
      </div>

      {/* Area drawing controls */}
      {!isTracking && (
        <div className="rounded-2xl border border-card-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Territories</p>
            <p className="text-sm font-bold text-primary mt-0.5">
              {drawMode
                ? `Tap the map to drop vertices · ${draftPolygon.length} so far`
                : `${areas.length} area${areas.length === 1 ? '' : 's'} assigned`}
            </p>
          </div>
          {!drawMode ? (
            <button
              onClick={startDrawing}
              className="inline-flex items-center gap-2 bg-surface-alt text-primary font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-surface-strong"
            >
              <Pencil size={14} /> Draw Area
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelDrawing}
                className="inline-flex items-center gap-1.5 bg-surface-alt text-secondary font-black uppercase tracking-wider text-xs px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-strong"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={() => setDraftPolygon((p) => p.slice(0, -1))}
                disabled={draftPolygon.length === 0}
                className="inline-flex items-center gap-1.5 bg-surface-alt text-secondary font-black uppercase tracking-wider text-xs px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-strong disabled:opacity-40"
              >
                Undo
              </button>
              <button
                onClick={finishDrawing}
                disabled={draftPolygon.length < 3}
                className="inline-flex items-center gap-1.5 bg-primary text-card font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check size={14} /> Finish
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected area detail */}
      {selectedArea && !drawMode && (
        <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapIcon size={14} className="text-blue-700 shrink-0" />
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">Selected Area</p>
            </div>
            <p className="text-lg font-black text-primary truncate">{selectedArea.name}</p>
            <p className="text-xs font-bold text-tertiary mt-0.5 inline-flex items-center gap-1 flex-wrap">
              <UserCircle size={12} /> {selectedArea.assignedTo || 'Unassigned'}
              {selectedArea.houseCount != null && (
                <>
                  <span className="ml-2 text-primary">
                    · {selectedArea.houseCountSource === 'york-county' ? '' : '≈ '}{selectedArea.houseCount} houses
                  </span>
                  {selectedArea.houseCountSource === 'york-county' && (
                    <span className="ml-1 text-emerald-700">(county records)</span>
                  )}
                  {selectedArea.houseCountSource === 'estimate' && (
                    <span className="ml-1 text-amber-700">(est. from area)</span>
                  )}
                  <button onClick={() => countBuildingsForArea(selectedArea)} className="ml-2 underline cursor-pointer hover:text-primary" title="Recount">
                    recount
                  </button>
                </>
              )}
              {recountStatus[selectedArea.id] === 'loading' && (
                <span className="ml-2">· counting…</span>
              )}
              {selectedArea.houseCount == null && recountStatus[selectedArea.id] === 'error' && (
                <button onClick={() => countBuildingsForArea(selectedArea)} className="ml-2 underline text-amber-700 cursor-pointer">
                  retry count
                </button>
              )}
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => deleteArea(selectedArea.id)} className="text-tertiary hover:text-rose-600 p-2 rounded-lg cursor-pointer">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setSelectedAreaId(null)} className="text-tertiary hover:text-primary p-2 rounded-lg cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Location permission banner */}
      {!isTracking && locationPermission === 'denied' && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          Location permission is blocked. Open your browser site settings for this page and switch Location to <span className="underline">Allow</span>, then refresh.
        </div>
      )}
      {!isTracking && (locationPermission === 'prompt' || locationPermission === 'unknown') && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-bold text-amber-900">Location access is required to track your walk.</p>
          <button
            onClick={requestLocation}
            className="inline-flex items-center gap-2 bg-amber-600 text-white font-black uppercase tracking-wider text-xs px-4 py-2 rounded-xl cursor-pointer hover:brightness-110"
          >
            <MapPin size={14} /> Enable Location
          </button>
        </div>
      )}

      {/* Sticky controls — z-index must beat Leaflet's internal panes (~700) */}
      <div className="sticky bottom-2" style={{ zIndex: 1000 }}>
        <div className="rounded-3xl border border-card-border bg-card p-3 sm:p-4 shadow-lg flex items-center gap-3 flex-wrap">
          {!isTracking ? (
            <button
              onClick={startTrip}
              disabled={locationPermission === 'denied'}
              className={`flex-1 inline-flex items-center justify-center gap-2 font-black uppercase tracking-wider text-base px-6 py-4 rounded-2xl ${
                locationPermission === 'denied'
                  ? 'bg-surface-alt text-muted cursor-not-allowed'
                  : 'bg-primary text-card cursor-pointer hover:brightness-110'
              }`}
            >
              <Play size={20} fill="currentColor" /> Start Trip
            </button>
          ) : (
            <button
              onClick={requestEnd}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 text-white font-black uppercase tracking-wider text-base px-6 py-4 rounded-2xl cursor-pointer hover:brightness-110"
            >
              <Square size={18} fill="currentColor" /> End Trip
            </button>
          )}
        </div>
      </div>

      {/* Active trip readout */}
      {isTracking && (
        <div className="rounded-2xl border border-card-border bg-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Walked" value={`${(pathDistance(livePath) / 1609.34).toFixed(2)} mi`} />
          <MiniStat label="Points" value={livePath.length} />
          <MiniStat label="Time" value={formatDuration(Date.now() - (startedAt || Date.now()))} />
          <MiniStat label="GPS" value={
            <span className={`inline-flex items-center gap-1.5 ${gpsColor(accuracy)}`}>
              <Signal size={14} /> {accuracy == null ? '—' : `${Math.round(accuracy)}m`}
            </span>
          } />
        </div>
      )}

      {/* Selected trip detail */}
      {selectedTrip && (
        <div className="rounded-2xl border border-card-border bg-card p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Tag size={14} className="text-tertiary shrink-0" />
              <p className="text-xs font-black uppercase tracking-wider text-tertiary">Selected Trip</p>
            </div>
            <p className="text-lg font-black text-primary truncate">{formatDefaultName(selectedTrip.startedAt)}</p>
            {(() => {
              const dur = (selectedTrip.endedAt || 0) - (selectedTrip.startedAt || 0);
              const pace = hangersPerHour(selectedTrip.packs, dur);
              return (
                <p className="text-xs font-bold text-tertiary mt-0.5">
                  {new Date(selectedTrip.startedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {' · '}{(pathDistance(selectedTrip.path || []) / 1609.34).toFixed(2)} mi
                  {' · '}{selectedTrip.packs || 0} hangers
                  {' · '}{formatDuration(dur)}
                  {pace ? ` · ${pace}/hr` : ''}
                  {selectedTrip.doneBy ? ` · ${selectedTrip.doneBy}` : ''}
                </p>
              );
            })()}
          </div>
          <button onClick={() => setSelectedTripId(null)} className="text-tertiary hover:text-primary p-2 rounded-lg cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {/* Trip history */}
      {trips.length > 0 && (
        <section className="rounded-3xl border border-card-border bg-card p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-tertiary mb-3">Trip History</h2>
          <ul className="divide-y divide-card-border">
            {[...trips].reverse().map((t) => {
              const isSel = t.id === selectedTripId;
              return (
                <li key={t.id} className={`py-3 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-xl ${isSel ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`} onClick={() => setSelectedTripId(t.id)}>
                  <div className="min-w-0">
                    <p className="font-bold text-primary truncate">{formatDefaultName(t.startedAt)}</p>
                    {(() => {
                      const dur = (t.endedAt || 0) - (t.startedAt || 0);
                      const pace = hangersPerHour(t.packs, dur);
                      return (
                        <p className="text-xs font-semibold text-tertiary">
                          {(pathDistance(t.path || []) / 1609.34).toFixed(2)} mi
                          {' · '}{t.packs || 0} hangers
                          {' · '}{formatDuration(dur)}
                          {pace ? ` · ${pace}/hr` : ''}
                          {t.doneBy ? ` · ${t.doneBy}` : ''}
                        </p>
                      );
                    })()}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteTrip(t.id); }} className="text-tertiary hover:text-rose-600 p-2 rounded-lg cursor-pointer shrink-0">
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Save-area modal */}
      {showAreaModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40" style={{ zIndex: 9999 }}>
          <div className="bg-card rounded-3xl border border-card-border max-w-sm w-full p-6">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 mb-3">
              <MapIcon size={22} />
            </div>
            <h2 className="text-xl font-black text-primary mb-1">Save this area</h2>
            <div className="text-sm text-tertiary font-semibold mb-4">
              <p>{draftPolygon.length} vertices</p>
              <p className="mt-1">
                {buildingCount === null && 'Counting houses…'}
                {typeof buildingCount === 'number' && (
                  <>
                    <span className="text-primary font-black">≈ {buildingCount}</span> houses
                    {buildingSource === 'estimate' && <span className="ml-1 text-amber-700">(est. from area size)</span>}
                  </>
                )}
                {buildingCount === false && <span className="text-amber-700">Could not estimate</span>}
              </p>
            </div>

            <label className="text-[11px] font-black uppercase tracking-wider text-tertiary">Area name</label>
            <input
              autoFocus
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="e.g. Westwood east side"
              className="w-full rounded-2xl bg-surface-alt border border-card-border px-4 py-3 text-base font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand mt-1 mb-3"
            />

            <label className="text-[11px] font-black uppercase tracking-wider text-tertiary">Assigned to (optional)</label>
            <input
              value={areaAssignee}
              onChange={(e) => setAreaAssignee(e.target.value)}
              placeholder={doneBy || 'e.g. Ethan'}
              className="w-full rounded-2xl bg-surface-alt border border-card-border px-4 py-3 text-base font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand mt-1 mb-5"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setShowAreaModal(false); }}
                className="flex-1 px-4 py-3 rounded-2xl bg-surface-alt text-secondary font-black cursor-pointer hover:bg-surface-strong"
              >
                Cancel
              </button>
              <button
                onClick={saveArea}
                className="flex-1 px-4 py-3 rounded-2xl bg-primary text-card font-black cursor-pointer hover:brightness-110"
              >
                Save Area
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End-trip modal */}
      {showEndModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40" style={{ zIndex: 9999 }}>
          <div className="bg-card rounded-3xl border border-card-border max-w-sm w-full p-6">
            <div className="w-11 h-11 rounded-2xl bg-surface-alt border border-card-border flex items-center justify-center text-primary mb-3">
              <Package size={22} />
            </div>
            <h2 className="text-xl font-black text-primary mb-1">Wrap up the trip</h2>

            {(() => {
              const tripMs = Date.now() - (startedAt || Date.now());
              const livePace = hangersPerHour(parseInt(packs, 10), tripMs);
              return (
                <div className="grid grid-cols-3 gap-3 my-4 rounded-2xl bg-surface-alt border border-card-border p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tertiary">Time</p>
                    <p className="text-xl font-black text-primary mt-0.5 leading-none">{formatDuration(tripMs)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tertiary">Distance</p>
                    <p className="text-xl font-black text-primary mt-0.5 leading-none">{(pathDistance(livePath) / 1609.34).toFixed(2)} mi</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tertiary">Pace</p>
                    <p className="text-xl font-black text-primary mt-0.5 leading-none">{livePace == null ? '—' : `${livePace}/hr`}</p>
                  </div>
                </div>
              );
            })()}

            {doneBy && (
              <p className="text-xs font-bold text-tertiary mb-3 inline-flex items-center gap-1.5">
                <User size={12} /> Logged as <span className="text-primary">{doneBy}</span>
              </p>
            )}

            <label className="text-[11px] font-black uppercase tracking-wider text-tertiary">Hangers dropped</label>
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={packs}
              onChange={(e) => setPacks(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTrip(); }}
              placeholder="e.g. 50"
              className="w-full rounded-2xl bg-surface-alt border border-card-border px-4 py-3 text-base font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand mt-1 mb-5"
            />

            <div className="flex gap-2">
              <button
                onClick={discardActive}
                className="flex-1 px-4 py-3 rounded-2xl bg-surface-alt text-secondary font-black cursor-pointer hover:bg-surface-strong"
              >
                Discard
              </button>
              <button
                onClick={saveTrip}
                className="flex-1 px-4 py-3 rounded-2xl bg-primary text-card font-black cursor-pointer hover:brightness-110"
              >
                Save Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tertiary">{label}</p>
      <p className="text-2xl font-black text-primary mt-1 leading-none">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-tertiary">{label}</p>
      <p className="text-base font-black text-primary mt-0.5">{value}</p>
    </div>
  );
}

function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pathDistance(path) {
  if (!path || path.length < 2) return 0;
  let m = 0;
  for (let i = 1; i < path.length; i++) m += haversine(path[i - 1], path[i]);
  return m;
}

function hangersPerHour(packs, ms) {
  if (!packs || !ms || ms <= 0) return null;
  const hours = ms / 3600000;
  return Math.round(packs / hours);
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatDefaultName(ts) {
  if (!ts) return 'Trip';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function gpsColor(acc) {
  if (acc == null) return 'text-tertiary';
  if (acc < 15) return 'text-emerald-600';
  if (acc < 40) return 'text-amber-600';
  return 'text-rose-600';
}
