import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useJsApiLoader, GoogleMap, MarkerF, DirectionsRenderer, Autocomplete } from '@react-google-maps/api';
import { extractCoordinates, formatDistance } from '../../utils/location';

const LIBRARIES = ['places'];

export default function GoogleMapView({
  apiKey,
  value,
  onChange,
  markers = [],
  route = false,
  onRouteInfo,
  height = 300,
  selectable = false,
  valueKind = 'customer'
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES
  });

  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);
  const autocompleteRef = useRef(null);

  const coords = extractCoordinates(value);
  const defaultCenter = coords || { lat: 12.9716, lng: 77.5946 }; // Default Bengaluru

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle map click for selectable mode
  const handleMapClick = (event) => {
    if (!selectable || !event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    // Geocode clicked location
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          onChange?.({
            lat,
            lng,
            address: results[0].formatted_address
          });
        } else {
          onChange?.({
            lat,
            lng,
            address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          });
        }
      });
    } else {
      onChange?.({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onChange?.({
          lat,
          lng,
          address: place.formatted_address || place.name || ''
        });
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(15);
        }
      }
    }
  };

  // Calculate Google Maps Directions when route is enabled
  useEffect(() => {
    if (!route || !isLoaded || !coords || markers.length === 0) {
      setDirections(null);
      return;
    }

    const firstWorker = markers[0];
    const workerCoords = extractCoordinates(firstWorker);
    if (!workerCoords) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(workerCoords.lat, workerCoords.lng),
        destination: new window.google.maps.LatLng(coords.lat, coords.lng),
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          const routeLeg = result.routes[0]?.legs[0];
          if (routeLeg && onRouteInfo) {
            onRouteInfo({
              distanceKm: (routeLeg.distance?.value || 0) / 1000,
              durationMinutes: (routeLeg.duration?.value || 0) / 60,
              approximate: false
            });
          }
        }
      }
    );
  }, [route, isLoaded, coords?.lat, coords?.lng, markers]);

  if (loadError) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-50 text-xs text-rose-600 p-4 rounded-xl border border-rose-200">
        Google Maps failed to load: {loadError.message}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-slate-50 text-xs text-slate-500 animate-pulse rounded-xl border border-slate-200">
        Loading Google Maps…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {selectable && (
        <div className="border-b border-slate-100 p-3">
          <Autocomplete
            onLoad={(auto) => { autocompleteRef.current = auto; }}
            onPlaceChanged={onPlaceChanged}
            options={{ componentRestrictions: { country: 'in' } }}
          >
            <input
              type="text"
              placeholder="Search Indian landmark, area, or PIN code with Google Maps"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none"
            />
          </Autocomplete>
          {coords?.address && (
            <p className="mt-2 text-xs font-medium text-forest-700">
              Selected: {coords.address}
            </p>
          )}
        </div>
      )}

      <div style={{ height, width: '100%' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={defaultCenter}
          zoom={coords ? 14 : 11}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false
          }}
        >
          {coords && (
            <MarkerF
              position={{ lat: coords.lat, lng: coords.lng }}
              title={valueKind === 'destination' ? 'Job Destination' : 'Job Location'}
            />
          )}

          {markers.map((m, idx) => {
            const mCoords = extractCoordinates(m);
            if (!mCoords) return null;
            return (
              <MarkerF
                key={m.id || idx}
                position={{ lat: mCoords.lat, lng: mCoords.lng }}
                title={m.name || 'Worker'}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }}
              />
            );
          })}

          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      </div>
    </div>
  );
}
