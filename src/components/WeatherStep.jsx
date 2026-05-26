import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudRain, Sun, Cloud, CloudSnow, Wind, Droplets, Thermometer, AlertTriangle, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

// Rock Hill, SC — service area center.
const LAT = 34.9249;
const LNG = -81.0251;
const ZOOM = 10;

// Open-Meteo: used for CURRENT conditions only (temp, feels-like, wind, humidity).
const CURRENT_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
  `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m` +
  `&timezone=America%2FNew_York&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

// National Weather Service: used for hourly + daily forecast. Same source TV
// stations (WSOC, Weather Channel) and Apple Weather blend from. Authoritative
// US government forecast. Rock Hill SC falls under office GSP, grid 114,51.
const NWS_HOURLY_URL = 'https://api.weather.gov/gridpoints/GSP/114,51/forecast/hourly';
const NWS_DAILY_URL = 'https://api.weather.gov/gridpoints/GSP/114,51/forecast';

// Map WMO weather codes (Open-Meteo) → label + icon. Used only for the
// current-conditions icon now. NWS uses shortForecast strings instead.
function describeWeather(code) {
  if (code == null) return { label: 'Unknown', Icon: Cloud, color: 'text-tertiary' };
  if (code === 0) return { label: 'Clear', Icon: Sun, color: 'text-amber-500' };
  if (code <= 2) return { label: 'Mostly clear', Icon: Sun, color: 'text-amber-500' };
  if (code === 3) return { label: 'Overcast', Icon: Cloud, color: 'text-tertiary' };
  if (code <= 48) return { label: 'Fog', Icon: Cloud, color: 'text-tertiary' };
  if (code <= 57) return { label: 'Drizzle', Icon: CloudRain, color: 'text-sky-600' };
  if (code <= 67) return { label: 'Rain', Icon: CloudRain, color: 'text-sky-700' };
  if (code <= 77) return { label: 'Snow', Icon: CloudSnow, color: 'text-sky-300' };
  if (code <= 82) return { label: 'Rain showers', Icon: CloudRain, color: 'text-sky-700' };
  if (code <= 86) return { label: 'Snow showers', Icon: CloudSnow, color: 'text-sky-300' };
  if (code >= 95) return { label: 'Thunderstorm', Icon: CloudRain, color: 'text-rose-600' };
  return { label: 'Unknown', Icon: Cloud, color: 'text-tertiary' };
}

// Translate an NWS shortForecast string → icon + color.
function describeNWS(short) {
  const s = (short || '').toLowerCase();
  if (s.includes('thunder')) return { Icon: CloudRain, color: 'text-rose-600', isStorm: true };
  if (s.includes('snow') || s.includes('sleet')) return { Icon: CloudSnow, color: 'text-sky-300' };
  if (s.includes('rain') || s.includes('shower') || s.includes('drizzle')) return { Icon: CloudRain, color: 'text-sky-700' };
  if (s.includes('fog') || s.includes('haze') || s.includes('overcast')) return { Icon: Cloud, color: 'text-tertiary' };
  if (s.includes('cloud')) return { Icon: Cloud, color: 'text-tertiary' };
  if (s.includes('sunny') || s.includes('clear')) return { Icon: Sun, color: 'text-amber-500' };
  return { Icon: Cloud, color: 'text-tertiary' };
}

// Parse NWS wind string like "5 mph" or "5 to 10 mph" → integer mph.
function parseWindMph(s) {
  if (!s) return 0;
  const nums = s.match(/\d+/g);
  if (!nums) return 0;
  // For ranges take the higher number (conservative).
  return parseInt(nums[nums.length - 1], 10);
}

export default function WeatherStep({ onContinue, hideContinue }) {
  const [current, setCurrent] = useState(null); // Open-Meteo current
  const [nwsHourly, setNwsHourly] = useState(null); // NWS hourly periods
  const [nwsDaily, setNwsDaily] = useState(null); // NWS daily day/night periods
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(CURRENT_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => setCurrent(d.current))
      .catch(() => { /* current is non-critical */ });
  }, []);

  useEffect(() => {
    fetch(NWS_HOURLY_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => setNwsHourly(d.properties?.periods || []))
      .catch((err) => setError(err.message || 'Could not load NWS forecast'));
    fetch(NWS_DAILY_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => setNwsDaily(d.properties?.periods || []))
      .catch(() => { /* daily fallback computed from hourly */ });
  }, []);

  // Build a unified hourly array (24h) from NWS — same shape the UI expects.
  const hourly = useMemo(() => {
    if (!nwsHourly) return null;
    return nwsHourly.slice(0, 24).map((p) => ({
      time: p.startTime,
      temp: Math.round(p.temperature),
      prob: p.probabilityOfPrecipitation?.value || 0,
      wind: parseWindMph(p.windSpeed),
      gust: parseWindMph(p.windSpeed), // NWS hourly doesn't separate gust
      windDir: p.windDirection || '',
      shortForecast: p.shortForecast || '',
    }));
  }, [nwsHourly]);

  // Build a 7-day array from NWS daily periods (paired day+night blocks).
  const daily = useMemo(() => {
    if (!nwsDaily) return null;
    const days = [];
    let current = null;
    for (const p of nwsDaily) {
      const date = new Date(p.startTime).toLocaleDateString('en-CA');
      if (!current || current.date !== date) {
        if (current) days.push(current);
        current = { date, day: null, night: null };
      }
      if (p.isDaytime) current.day = p;
      else current.night = p;
    }
    if (current) days.push(current);
    return days.slice(0, 7);
  }, [nwsDaily]);

  // Aggregate a list of hourly periods into work-hour stats (7AM-5PM).
  // Pure function used by both the tomorrow card and 7-day list.
  const workHoursSummary = (periods, dateStr) => {
    let maxProb = 0, maxWind = 0, hasStorm = false, hours = 0;
    for (const p of periods) {
      const t = new Date(p.time || p.startTime);
      const localDate = t.toLocaleDateString('en-CA');
      const hour = t.getHours();
      if (dateStr && localDate !== dateStr) continue;
      if (hour < 7 || hour > 17) continue;
      hours++;
      const prob = p.prob != null ? p.prob : (p.probabilityOfPrecipitation?.value || 0);
      maxProb = Math.max(maxProb, prob);
      const wind = p.wind != null ? p.wind : parseWindMph(p.windSpeed);
      maxWind = Math.max(maxWind, wind);
      // Only count as a storm day if NWS sounds confident:
      // "Thunderstorms" (no qualifier) or "Thunderstorms Likely".
      // "Chance" / "Slight Chance" Thunderstorms is just possibility — use prob instead.
      const short = (p.shortForecast || '').toLowerCase();
      if (short.includes('thunder') && (short.includes('likely') || !short.includes('chance'))) {
        hasStorm = true;
      }
    }
    return { maxProb, maxWind, hasStorm, hours };
  };

  const verdictFor = (summary) => {
    const { maxProb, maxWind, hasStorm } = summary;
    if (hasStorm || maxProb >= 70 || maxWind >= 40) {
      return { call: 'no', label: "DON'T WORK", reason: hasStorm ? 'Thunderstorms forecast' : maxProb >= 70 ? `${maxProb}% chance of rain` : `${maxWind} mph wind` };
    }
    if (maxProb >= 40 || maxWind >= 30) {
      return { call: 'maybe', label: 'WATCH IT', reason: maxProb >= 40 ? `${maxProb}% rain chance — keep an eye on radar` : `${maxWind} mph wind` };
    }
    return { call: 'yes', label: 'WORK', reason: maxProb >= 20 ? `Only ${maxProb}% rain chance` : 'Clear forecast' };
  };

  // "Should we work tomorrow?" — scan tomorrow's 7AM-5PM forecast (NWS).
  const tomorrowVerdict = useMemo(() => {
    if (!hourly) return null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toLocaleDateString('en-CA');
    const summary = workHoursSummary(hourly, tomorrowDateStr);
    if (summary.hours === 0) return null;
    return verdictFor(summary);
  }, [hourly]);

  // Next-rain calc: scan hourly forecast for first hour with prob >= 40%.
  const nextRain = useMemo(() => {
    if (!hourly) return null;
    const now = Date.now();
    for (const h of hourly) {
      const t = new Date(h.time).getTime();
      if (t < now) continue;
      if (h.prob >= 40) {
        const minutes = Math.round((t - now) / 60000);
        return { whenMs: t, minutes, prob: h.prob };
      }
    }
    return null;
  }, [hourly]);

  if (error && !hourly) {
    return (
      <Wrapper onContinue={onContinue} hideContinue={hideContinue}>
        <p className="text-sm font-bold text-rose-600">Could not load weather: {error}</p>
      </Wrapper>
    );
  }
  if (!hourly) {
    return (
      <Wrapper onContinue={onContinue} hideContinue={hideContinue}>
        <p className="text-sm font-semibold text-tertiary">Loading Rock Hill weather…</p>
      </Wrapper>
    );
  }

  const cur = current || {};
  const today = describeWeather(cur.weather_code);
  const Icon = today.Icon;

  return (
    <Wrapper onContinue={onContinue} hideContinue={hideContinue}>
      {/* Tomorrow verdict — should we work? */}
      {tomorrowVerdict && (() => {
        const styles = {
          yes:   { bg: 'bg-emerald-50',  border: 'border-emerald-400', text: 'text-emerald-900', big: 'text-emerald-700',   Icon: ThumbsUp },
          maybe: { bg: 'bg-amber-50',    border: 'border-amber-400',   text: 'text-amber-900',   big: 'text-amber-700',     Icon: AlertCircle },
          no:    { bg: 'bg-rose-50',     border: 'border-rose-400',    text: 'text-rose-900',    big: 'text-rose-700',      Icon: ThumbsDown },
        }[tomorrowVerdict.call];
        const Big = styles.Icon;
        return (
          <div className={`rounded-3xl border-2 ${styles.border} ${styles.bg} p-5 flex items-center gap-4`}>
            <div className={`${styles.big}`}>
              <Big size={44} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Work Tomorrow?</p>
              <p className={`text-4xl font-black ${styles.big} leading-none mt-1`}>{tomorrowVerdict.label}</p>
              <p className={`text-sm font-bold ${styles.text} mt-1`}>{tomorrowVerdict.reason}</p>
            </div>
          </div>
        );
      })()}

      {/* Current conditions */}
      <div className="rounded-3xl border border-card-border bg-card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-surface-alt border border-card-border flex items-center justify-center ${today.color}`}>
              <Icon size={36} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Rock Hill, SC · Now</p>
              <p className="text-5xl sm:text-6xl font-black text-primary leading-none mt-1">
                {Math.round(cur.temperature_2m)}°
              </p>
              <p className="text-sm font-bold text-tertiary mt-1">
                Feels {Math.round(cur.apparent_temperature)}° · {today.label}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm font-bold">
            <div className="inline-flex items-center gap-1.5"><Wind size={14} className="text-tertiary" /> {Math.round(cur.wind_speed_10m)} mph</div>
            <div className="inline-flex items-center gap-1.5"><Droplets size={14} className="text-tertiary" /> {cur.relative_humidity_2m}%</div>
          </div>
        </div>

        {/* Next-rain banner */}
        {nextRain ? (
          <div className="mt-4 rounded-2xl bg-sky-50 border border-sky-300 px-4 py-3 inline-flex items-center gap-2 text-sm font-bold text-sky-900">
            <CloudRain size={16} />
            Next rain: {nextRain.minutes < 60 ? `in ${nextRain.minutes} min` : `in ${Math.round(nextRain.minutes / 60)}h ${nextRain.minutes % 60}m`} ({nextRain.prob}% chance)
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-300 px-4 py-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-900">
            <Sun size={16} />
            No rain in the next 24 hours.
          </div>
        )}
      </div>

      {/* Hourly forecast — vertical, hour-by-hour with wind + rain */}
      <div className="rounded-3xl border border-card-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Next 24 hours</p>
          <p className="text-[10px] font-bold text-tertiary">Hour · Temp · Wind · Rain %</p>
        </div>
        <ul className="divide-y divide-card-border">
          {hourly.map((h, i) => {
            const w = describeNWS(h.shortForecast);
            const HIcon = w.Icon;
            const hour = new Date(h.time).toLocaleTimeString([], { hour: 'numeric' });
            const prob = h.prob;
            const probColor = prob >= 60 ? 'text-sky-700' : prob >= 30 ? 'text-amber-700' : 'text-tertiary';
            const probBg = prob >= 60 ? 'bg-sky-600' : prob >= 30 ? 'bg-amber-500' : 'bg-gray-400';
            const windy = h.wind >= 25;
            const breezy = h.wind >= 15;
            const windColor = windy ? 'text-rose-700' : breezy ? 'text-amber-700' : 'text-tertiary';
            return (
              <li key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="w-14 shrink-0 text-sm font-black text-primary tabular-nums">{hour}</span>
                <HIcon size={20} className={`${w.color} shrink-0`} />
                <span className="w-10 shrink-0 text-base font-black text-primary tabular-nums">{h.temp}°</span>
                <span className={`w-20 shrink-0 text-xs font-bold tabular-nums ${windColor} inline-flex items-center gap-1`}>
                  <Wind size={11} /> {h.wind} {h.windDir}
                </span>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="flex-1 h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div className={`h-full ${probBg} transition-all`} style={{ width: `${prob}%` }} />
                  </div>
                  <span className={`w-12 text-right text-sm font-black tabular-nums ${probColor}`}>{prob}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 7-day outlook from NWS — verdict per day scanned over 7AM-5PM work hours */}
      {daily && (() => {
        // Scan ALL hourly periods (not just first 24) for per-day work-hour aggregates.
        const byDate = new Map();
        for (const p of nwsHourly || []) {
          const t = new Date(p.startTime);
          const key = t.toLocaleDateString('en-CA');
          const hour = t.getHours();
          if (hour < 7 || hour > 17) continue;
          if (!byDate.has(key)) byDate.set(key, { maxProb: 0, maxWind: 0, hasStorm: false });
          const r = byDate.get(key);
          r.maxProb = Math.max(r.maxProb, p.probabilityOfPrecipitation?.value || 0);
          r.maxWind = Math.max(r.maxWind, parseWindMph(p.windSpeed));
          const sf = (p.shortForecast || '').toLowerCase();
          if (sf.includes('thunder') && (sf.includes('likely') || !sf.includes('chance'))) r.hasStorm = true;
        }
        return (
          <div className="rounded-3xl border border-card-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Next 7 days</p>
              <p className="text-[10px] font-bold text-tertiary">NWS · 7am-5pm only</p>
            </div>
            <ul className="divide-y divide-card-border">
              {daily.map((d, i) => {
                const date = new Date(`${d.date}T12:00:00`);
                const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short' });
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const dayPeriod = d.day || d.night;
                const nightPeriod = d.night || d.day;
                const hi = dayPeriod?.temperature ?? null;
                const lo = nightPeriod?.temperature ?? null;
                const short = dayPeriod?.shortForecast || '';
                const w = describeNWS(short);
                const DIcon = w.Icon;
                const r = byDate.get(d.date) || { maxProb: 0, maxWind: 0, hasStorm: false };
                const isToday = i === 0;
                // If no work hours remain (e.g. today after 5pm), show "DAY OVER" instead of WORK.
                const noWorkHours = isToday && (new Date()).getHours() >= 17;
                const verdict = noWorkHours ? { call: 'done', label: 'DAY OVER' } : verdictFor(r);
                const vColor = verdict.call === 'yes' ? 'bg-emerald-100 text-emerald-800'
                  : verdict.call === 'maybe' ? 'bg-amber-100 text-amber-800'
                  : verdict.call === 'done' ? 'bg-surface-alt text-tertiary'
                  : 'bg-rose-100 text-rose-800';
                return (
                  <li key={d.date} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-16 shrink-0">
                      <p className="text-sm font-black text-primary leading-none">{isToday ? 'Today' : dayLabel}</p>
                      <p className="text-[10px] font-bold text-tertiary mt-0.5">{dateStr}</p>
                    </div>
                    <DIcon size={22} className={`${w.color} shrink-0`} />
                    <div className="w-16 shrink-0 text-sm tabular-nums">
                      {hi != null && <span className="font-black text-primary">{Math.round(hi)}°</span>}
                      {lo != null && <span className="text-tertiary"> / {Math.round(lo)}°</span>}
                    </div>
                    <div className="flex-1 min-w-0 inline-flex items-center gap-2">
                      <CloudRain size={12} className="text-tertiary shrink-0" />
                      <span className={`text-xs font-bold tabular-nums ${r.maxProb >= 60 ? 'text-sky-700' : r.maxProb >= 30 ? 'text-amber-700' : 'text-tertiary'}`}>{r.maxProb}%</span>
                      {short && <span className="text-[10px] font-bold text-tertiary truncate hidden sm:inline">· {short}</span>}
                    </div>
                    <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${vColor}`}>
                      {verdict.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {/* Live radar — sharp storm cells, past 2h + 1h nowcast */}
      <div className="rounded-3xl border border-card-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-tertiary">Live Radar · storm cells</p>
          <p className="text-[10px] font-bold text-tertiary">now ± 1h</p>
        </div>
        <iframe
          title="Rock Hill live radar"
          src={`https://embed.windy.com/embed2.html?lat=${LAT}&lon=${LNG}&zoom=9&overlay=radar&product=radar&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=${LAT}&detailLon=${LNG}&metricWind=mph&metricTemp=%C2%B0F`}
          style={{ width: '100%', height: 360, border: 0, display: 'block' }}
          loading="lazy"
        />
      </div>


    </Wrapper>
  );
}

function Wrapper({ children, onContinue, hideContinue }) {
  return (
    <div className="space-y-4">
      {children}
      {!hideContinue && (
        <button
          onClick={onContinue}
          className="w-full bg-primary text-card font-black uppercase tracking-wider text-base py-4 rounded-2xl cursor-pointer hover:brightness-110 inline-flex items-center justify-center gap-2"
        >
          Continue →
        </button>
      )}
    </div>
  );
}
