import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { distanceInKm, formatDistance, isValidCoordinate } from '../../utils/location';

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const nominatimUrl = (import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const osrmUrl = (import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
let lastNominatimRequest = 0;
let nominatimQueue = Promise.resolve();

function fetchNominatim(url) {
  const request = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequest));
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastNominatimRequest = Date.now();
    return fetch(url);
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
  const result = reverse ? await response.json() : (await response.json())[0];
  if (!result) return null;
  const parts = result.address || {};
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    address: result.display_name,
    city: parts.city || parts.town || parts.village || parts.municipality || parts.county || '',
    state: parts.state || '',
    pincode: parts.postcode || ''
  };
}

function markerIcon(kind = 'customer') {
  return L.divIcon({
    className: 'crewlink-marker',
    html: `<span class="location-dot location-dot--${kind}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
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

function RouteLayer({ origin, destination, onRouteInfo }) {
  const [route, setRoute] = useState(null);
  const onRouteInfoRef = useRef(onRouteInfo);
  onRouteInfoRef.current = onRouteInfo;
  useEffect(() => {
    let active = true;
    setRoute(null);
    onRouteInfoRef.current?.(null);
    if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) return () => { active = false; };

    async function loadRoute() {
      try {
        const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
        const response = await fetch(`${osrmUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
        if (!response.ok) throw new Error('Routing service is unavailable.');
        const result = await response.json();
        const bestRoute = result.routes?.[0];
        if (!bestRoute) throw new Error('No road route was found.');
        const positions = bestRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        if (!active) return;
        setRoute(positions);
        onRouteInfoRef.current?.({ distanceKm: bestRoute.distance / 1000, durationMinutes: bestRoute.duration / 60, approximate: false });
      } catch {
        if (!active) return;
        setRoute([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
        onRouteInfoRef.current?.({ distanceKm: distanceInKm(origin, destination), durationMinutes: null, approximate: true });
      }
    }

    loadRoute();
    return () => { active = false; };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return route ? <Polyline positions={route} pathOptions={{ color: '#176b5b', dashArray: route.length === 2 ? '7 8' : undefined, weight: 4 }}/> : null;
}

export default function LocationMap({ value, onChange, markers = [], route = false, onRouteInfo, height = 300, selectable = false, valueKind = 'customer' }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const addressLookupId = useRef(0);
  const validValue = isValidCoordinate(value);
  const mapMarker = validValue ? value : null;
  const firstMarker = markers.find(isValidCoordinate);
  const center = mapMarker ? [mapMarker.lat, mapMarker.lng] : firstMarker ? [firstMarker.lat, firstMarker.lng] : [22.9734, 78.6569];

  async function selectLocation(location) {
    if (!isValidCoordinate(location)) {
      setSearchError('The selected coordinates are invalid.');
      return;
    }
    const lookupId = ++addressLookupId.current;
    setSearchError('');
    onChange?.({ ...location, address: `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}` });
    try {
      const details = await lookupAddress(location, true);
      if (details && lookupId === addressLookupId.current) onChange?.({ ...details, ...location });
    } catch {
      if (lookupId === addressLookupId.current) setSearchError('Address lookup is unavailable. The map pin is saved using its coordinates.');
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
        setSearchError('No matching Indian address found. Try a nearby landmark or PIN code.');
      } else {
        onChange?.(result);
      }
    } catch {
      if (lookupId === addressLookupId.current) setSearchError('Address search is unavailable. You can still select a location on the map.');
    } finally {
      setSearching(false);
    }
  }

  function detectLocation() {
    const requestId = ++addressLookupId.current;
    setSearchError('');
    if (!navigator.geolocation) {
      setSearchError('GPS is unavailable in this browser. Search or pin your location manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (requestId === addressLookupId.current) selectLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      (error) => {
        setLocating(false);
        if (requestId !== addressLookupId.current) return;
        const messages = {
          1: 'Location permission was denied. Search or pin your location manually.',
          2: 'Your location is unavailable. Check GPS and select a location manually.',
          3: 'GPS request timed out. Try again or select a location manually.'
        };
        setSearchError(messages[error.code] || 'Could not detect your location. Select it manually.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  }

  const routeOrigin = markers.find(isValidCoordinate);

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    {selectable && <div className="border-b border-slate-100 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={search} className="flex min-w-0 flex-1 gap-2">
          <label htmlFor="map-search" className="sr-only">Search Indian address, area, city or PIN code</label>
          <input id="map-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area, city or PIN code" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"/>
          <button type="submit" disabled={searching} className="rounded-lg bg-forest-600 px-4 text-sm font-bold text-white disabled:opacity-60">{searching ? 'Searching…' : 'Search'}</button>
        </form>
        <button type="button" onClick={detectLocation} disabled={locating} className="rounded-lg border border-forest-200 px-3 py-2 text-sm font-bold text-forest-700 disabled:opacity-60">{locating ? 'Detecting…' : 'Detect my location'}</button>
      </div>
      {searchError && <p role="status" className="mt-2 text-xs text-rose-700">{searchError}</p>}
      {mapMarker?.address && <p className="mt-2 line-clamp-2 text-xs font-medium text-forest-700">Selected: {mapMarker.address}</p>}
    </div>}
    <MapContainer center={center} zoom={mapMarker ? 14 : firstMarker ? 12 : 5} scrollWheelZoom={false} style={{ height }} key={`${center[0]}-${center[1]}`}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={tileUrl}/>
      <PinEvents enabled={selectable} onSelect={selectLocation}/>
      {mapMarker && <Marker position={[mapMarker.lat, mapMarker.lng]} icon={markerIcon(valueKind)} title={valueKind === 'destination' ? 'Job destination' : 'Selected job location'}><Popup>{valueKind === 'destination' ? 'Job destination' : 'Job location'}</Popup></Marker>}
      {markers.filter(isValidCoordinate).map((marker) => <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={markerIcon(marker.selected ? 'selected' : 'worker')} title={marker.name || 'Available worker'}><Popup>{marker.name || 'Available worker'}{Number.isFinite(marker.distanceKm) ? ` · ${formatDistance(marker.distanceKm)}` : ''}</Popup></Marker>)}
      {route && routeOrigin && mapMarker && <RouteLayer origin={routeOrigin} destination={mapMarker} onRouteInfo={(info) => { setRouteInfo(info); onRouteInfo?.(info); }}/>}
    </MapContainer>
    {route && <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500" aria-live="polite">
      {!routeOrigin || !mapMarker ? 'Select a worker and job location to view a route.' : !routeInfo ? 'Road route is loading…' : `${routeInfo.approximate ? 'Approximate straight-line distance' : 'Road distance'}: ${formatDistance(routeInfo.distanceKm)}${routeInfo.durationMinutes ? ` · about ${Math.round(routeInfo.durationMinutes)} min` : ''}${routeInfo.approximate ? ' · road routing unavailable' : ''}`}
    </div>}
  </div>;
}
