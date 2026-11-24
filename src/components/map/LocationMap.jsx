import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { distanceInKm, extractCoordinates, formatDistance, getBrowserLocation, isValidCoordinate } from '../../utils/location';
import GoogleMapView from './GoogleMapView';

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const nominatimUrl = (import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const osrmUrl = (import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

let lastNominatimRequest = 0;
let nominatimQueue = Promise.resolve();

function fetchNominatim(url, options = {}) {
  const request = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequest));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastNominatimRequest = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  });
  nominatimQueue = request.then(() => undefined, () => undefined);
  return request;
}

async function lookupAddress(location, reverse = false) {
  const params = new URLSearchParams(reverse
    ? { format: 'jsonv2', lat: String(location.lat), lon: String(location.lng), addressdetails: '1' }
    : { format: 'jsonv2', limit: '1', addressdetails: '1', countrycodes: 'in', q: location });

  const response = await fetchNominatim(`${nominatimUrl}/${reverse ? 'reverse' : 'search'}?${params}`);
  if (!response.ok) throw new Error('Address lookup service is unavailable.');
  const rawData = await response.json();
  const result = reverse ? rawData : (Array.isArray(rawData) ? rawData[0] : null);
  if (!result || !result.lat || !result.lon) return null;

  const parts = result.address || {};
  const city = parts.city || parts.town || parts.village || parts.municipality || parts.county || parts.state_district || parts.suburb || '';
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    address: result.display_name,
    city,
    state: parts.state || '',
    pincode: parts.postcode || ''
  };
}

function markerIcon(kind = 'customer') {
  return L.divIcon({
    className: 'crewlink-marker',
    html: `<span class="location-dot location-dot--${kind}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
}

function PinEvents({ onSelect, enabled }) {
  useMapEvents({
    click(event) {
      if (enabled) onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

function MapViewController({ center, zoom, bounds, triggerFlyTo }) {
  const map = useMap();
  const lastBoundsKeyRef = useRef(null);
  const lastCenterKeyRef = useRef(null);

  // Invalidate map size on mount and window resize so tiles never render partially grey
  useEffect(() => {
    map.invalidateSize();
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [map]);

  // When multiple points exist (route / worker markers), fit bounds cleanly
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      const boundsKey = bounds.toBBoxString();
      if (lastBoundsKeyRef.current !== boundsKey) {
        lastBoundsKeyRef.current = boundsKey;
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
      }
    } else if (center && !triggerFlyTo) {
      const centerKey = `${Number(center[0]).toFixed(4)},${Number(center[1]).toFixed(4)},${zoom}`;
      if (lastCenterKeyRef.current !== centerKey) {
        lastCenterKeyRef.current = centerKey;
        map.setView(center, zoom, { animate: true });
      }
    }
  }, [map, bounds, center, zoom, triggerFlyTo]);

  // When user actively triggered search or GPS detection, smoothly fly to target
  useEffect(() => {
    if (triggerFlyTo && isValidCoordinate(triggerFlyTo)) {
      const coords = extractCoordinates(triggerFlyTo);
      if (coords) {
        map.flyTo([coords.lat, coords.lng], 14, { duration: 1 });
      }
    }
  }, [map, triggerFlyTo]);

  return null;
}

function RouteLayer({ origin, destination, onRouteInfo }) {
  const [route, setRoute] = useState(null);
  const onRouteInfoRef = useRef(onRouteInfo);
  onRouteInfoRef.current = onRouteInfo;

  useEffect(() => {
    let active = true;
    setRoute(null);
    onRouteInfoRef.current?.(null);

    const from = extractCoordinates(origin);
    const to = extractCoordinates(destination);
    if (!from || !to) return () => { active = false; };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    async function loadRoute() {
      try {
        const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
        const response = await fetch(
          `${osrmUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Routing service is unavailable.');
        const result = await response.json();
        const bestRoute = result.routes?.[0];
        if (!bestRoute || !bestRoute.geometry?.coordinates) throw new Error('No road route was found.');
        const positions = bestRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        if (!active) return;
        setRoute(positions);
        onRouteInfoRef.current?.({
          distanceKm: bestRoute.distance / 1000,
          durationMinutes: bestRoute.duration / 60,
          approximate: false
        });
      } catch {
        if (!active) return;
        setRoute([[from.lat, from.lng], [to.lat, to.lng]]);
        onRouteInfoRef.current?.({
          distanceKm: distanceInKm(from, to),
          durationMinutes: null,
          approximate: true
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    loadRoute();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return route ? (
    <Polyline
      positions={route}
      pathOptions={{ color: '#176b5b', dashArray: route.length === 2 ? '7 8' : undefined, weight: 4 }}
    />
  ) : null;
}

export default function LocationMap(props) {
  if (googleMapsApiKey && !googleMapsApiKey.includes('your-google-maps')) {
    return <GoogleMapView apiKey={googleMapsApiKey} {...props} />;
  }

  const {
    value,
    onChange,
    markers = [],
    route = false,
    onRouteInfo,
    height = 300,
    selectable = false,
    valueKind = 'customer'
  } = props;
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const addressLookupId = useRef(0);

  // Normalize mapMarker from value
  const mapMarkerCoords = extractCoordinates(value);
  const mapMarker = mapMarkerCoords
    ? { ...mapMarkerCoords, address: value?.address || value?.job_address || '' }
    : null;

  // Normalize valid markers
  const validMarkers = useMemo(() => {
    return (markers || [])
      .map((marker) => {
        const coords = extractCoordinates(marker);
        if (!coords) return null;
        return {
          ...marker,
          ...coords,
          id: marker.id || `${coords.lat}-${coords.lng}`,
          name: marker.name || ''
        };
      })
      .filter(Boolean);
  }, [markers]);

  // Compute map center and bounds
  const firstMarker = validMarkers[0] || null;
  const center = useMemo(() => {
    if (mapMarker) return [mapMarker.lat, mapMarker.lng];
    if (firstMarker) return [firstMarker.lat, firstMarker.lng];
    return [22.9734, 78.6569]; // Default center of India
  }, [mapMarker?.lat, mapMarker?.lng, firstMarker?.lat, firstMarker?.lng]);

  const mapBounds = useMemo(() => {
    const points = [];
    if (mapMarker) points.push([mapMarker.lat, mapMarker.lng]);
    validMarkers.forEach((m) => points.push([m.lat, m.lng]));
    if (points.length > 1) {
      return L.latLngBounds(points);
    }
    return null;
  }, [mapMarker, validMarkers]);

  async function selectLocation(location, shouldFly = false) {
    const coords = extractCoordinates(location);
    if (!coords) {
      setSearchError('The selected coordinates are invalid.');
      return;
    }
    const lookupId = ++addressLookupId.current;
    setSearchError('');
    if (shouldFly) setFlyToTarget(coords);

    // Immediately emit coordinates so UI updates responsive to user action
    const coordFallback = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    onChange?.({ ...coords, address: location.address || coordFallback });

    // Reverse lookup to obtain detailed address
    setReverseGeocoding(true);
    try {
      const details = await lookupAddress(coords, true);
      if (details && lookupId === addressLookupId.current) {
        onChange?.({ ...details, ...coords });
      }
    } catch {
      if (lookupId === addressLookupId.current) {
        setSearchError('Saved location coordinates. Reverse address lookup is temporarily unavailable.');
      }
    } finally {
      if (lookupId === addressLookupId.current) {
        setReverseGeocoding(false);
      }
    }
  }

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    const lookupId = ++addressLookupId.current;
    try {
      const result = await lookupAddress(query.trim());
      if (lookupId !== addressLookupId.current) return;
      if (!result) {
        setSearchError('No matching Indian address found. Try a nearby landmark, area, or PIN code.');
      } else {
        setFlyToTarget({ lat: result.lat, lng: result.lng });
        onChange?.(result);
      }
    } catch {
      if (lookupId === addressLookupId.current) {
        setSearchError('Address search is currently unavailable. You can still pin your location on the map.');
      }
    } finally {
      if (lookupId === addressLookupId.current) {
        setSearching(false);
      }
    }
  }

  async function detectLocation() {
    setSearchError('');
    setLocating(true);
    try {
      const coords = await getBrowserLocation();
      selectLocation(coords, true);
    } catch (error) {
      setSearchError(error.message || 'Could not detect your location. Select it manually.');
    } finally {
      setLocating(false);
    }
  }

  const routeOrigin = validMarkers[0] || null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {selectable && (
        <div className="border-b border-slate-100 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <form onSubmit={search} className="flex min-w-0 flex-1 gap-2">
              <label htmlFor="map-search" className="sr-only">
                Search Indian address, area, city or PIN code
              </label>
              <input
                id="map-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search area, city or PIN code"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-forest-600 px-4 text-sm font-bold text-white transition hover:bg-forest-700 disabled:opacity-60"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </form>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="rounded-lg border border-forest-200 px-3 py-2 text-sm font-bold text-forest-700 transition hover:bg-forest-50 disabled:opacity-60"
            >
              {locating ? 'Detecting…' : 'Detect my location'}
            </button>
          </div>
          {searchError && (
            <p role="status" className="mt-2 text-xs text-rose-700">
              {searchError}
            </p>
          )}
          {reverseGeocoding && (
            <p className="mt-2 text-xs text-slate-500 animate-pulse">
              Looking up address details…
            </p>
          )}
          {mapMarker?.address && (
            <p className="mt-2 line-clamp-2 text-xs font-medium text-forest-700">
              Selected: {mapMarker.address}
            </p>
          )}
        </div>
      )}

      <div style={{ height, width: '100%' }} className="relative">
        <MapContainer
          center={center}
          zoom={mapMarker ? 14 : firstMarker ? 12 : 5}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={tileUrl}
            maxZoom={19}
          />
          <MapViewController
            center={center}
            zoom={mapMarker ? 14 : firstMarker ? 12 : 5}
            bounds={mapBounds}
            triggerFlyTo={flyToTarget}
          />
          <PinEvents enabled={selectable} onSelect={(loc) => selectLocation(loc, false)} />
          {mapMarker && (
            <Marker
              position={[mapMarker.lat, mapMarker.lng]}
              icon={markerIcon(valueKind)}
              title={valueKind === 'destination' ? 'Job destination' : 'Selected job location'}
            >
              <Popup>{valueKind === 'destination' ? 'Job destination' : 'Job location'}</Popup>
            </Marker>
          )}
          {validMarkers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={markerIcon(marker.selected ? 'selected' : 'worker')}
              title={marker.name || 'Available worker'}
            >
              <Popup>
                {marker.name || 'Available worker'}
                {Number.isFinite(marker.distanceKm) ? ` · ${formatDistance(marker.distanceKm)}` : ''}
              </Popup>
            </Marker>
          ))}
          {route && routeOrigin && mapMarker && (
            <RouteLayer
              origin={routeOrigin}
              destination={mapMarker}
              onRouteInfo={(info) => {
                setRouteInfo(info);
                onRouteInfo?.(info);
              }}
            />
          )}
        </MapContainer>
      </div>

      {route && (
        <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500" aria-live="polite">
          {!routeOrigin || !mapMarker
            ? 'Select a worker and job location to view a route.'
            : !routeInfo
              ? 'Road route is loading…'
              : `${routeInfo.approximate ? 'Approximate straight-line distance' : 'Road distance'}: ${formatDistance(routeInfo.distanceKm)}${
                  routeInfo.durationMinutes ? ` · about ${Math.round(routeInfo.durationMinutes)} min` : ''
                }${routeInfo.approximate ? ' · road routing unavailable' : ''}`}
        </div>
      )}
    </div>
  );
}
