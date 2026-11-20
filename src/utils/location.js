/**
 * Extracts and normalizes coordinate values from multiple common formats:
 * - { lat, lng }
 * - { latitude, longitude }
 * - { lat, lon }
 * - Numeric strings or numbers
 * Returns { lat: number, lng: number } or null if invalid.
 */
export function extractCoordinates(location) {
  if (!location || typeof location !== 'object') return null;
  const latVal = location.lat !== undefined ? location.lat : location.latitude;
  const lngVal = location.lng !== undefined ? location.lng : location.lon !== undefined ? location.lon : location.longitude;
  if (latVal === null || latVal === undefined || latVal === '' ||
      lngVal === null || lngVal === undefined || lngVal === '') {
    return null;
  }
  const lat = Number(latVal);
  const lng = Number(lngVal);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

export function isValidCoordinate(location) {
  return extractCoordinates(location) !== null;
}

export function distanceInKm(from, to) {
  const coordFrom = extractCoordinates(from);
  const coordTo = extractCoordinates(to);
  if (!coordFrom || !coordTo) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(coordTo.lat - coordFrom.lat);
  const longitudeDelta = radians(coordTo.lng - coordFrom.lng);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(coordFrom.lat))
    * Math.cos(radians(coordTo.lat))
    * Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(clampedHaversine), Math.sqrt(1 - clampedHaversine));
}

export function formatDistance(kilometres) {
  if (!Number.isFinite(kilometres) || kilometres < 0) return 'Distance unavailable';
  if (kilometres < 1) return `${Math.round(kilometres * 1000)} m`;
  return `${kilometres.toFixed(1)} km`;
}

export function findNearbyWorkers(workers, location, radiusKm, requiredSkills = []) {
  const target = extractCoordinates(location);
  if (!target || !Number.isFinite(radiusKm) || radiusKm < 0) return [];
  const required = (requiredSkills || []).map((skill) => String(skill).toLowerCase().trim()).filter(Boolean);
  return (workers || [])
    .filter((worker) => {
      if (worker?.availability_status !== 'available' || !worker?.location_sharing_enabled) return false;
      if (!isValidCoordinate(worker?.location)) return false;
      if (!required.length) return true;
      const skills = (worker.skills || []).map((s) => String(s).toLowerCase().trim());
      // If job is generic manual labor, any manual worker qualifies
      if (required.some((r) => r.includes('manual') || r.includes('other'))) {
        return skills.length > 0;
      }
      return required.some((req) => skills.some((candidate) => candidate.includes(req) || req.includes(candidate)));
    })
    .map((worker) => ({ ...worker, distanceKm: distanceInKm(target, worker.location) }))
    .filter((worker) => worker.distanceKm !== null && worker.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm || (b.rating || 0) - (a.rating || 0));
}

/**
 * Robust browser geolocation retrieval with automatic fallback:
 * 1. Tries high accuracy (GPS / mobile) with a reasonable timeout.
 * 2. If high accuracy times out or is unavailable (common on desktop/laptops),
 *    falls back to standard accuracy (Wi-Fi/network triangulation/cached).
 * 3. Immediately rejects if permission is denied (error code 1) without retrying.
 */
export function getBrowserLocation(options = {}) {
  const {
    highAccuracyTimeout = 8_000,
    lowAccuracyTimeout = 10_000,
    maximumAge = 30_000
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return reject(new Error('GPS is unavailable in this browser. Search or pin your location manually.'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        // User explicitly denied permission -> do not retry
        if (error.code === 1) {
          return reject(new Error('Location permission was denied. Search or pin your location manually.'));
        }
        // If high accuracy timed out or was unavailable, retry with low accuracy (network/IP/cached)
        navigator.geolocation.getCurrentPosition(
          (fallbackPosition) => {
            resolve({
              lat: fallbackPosition.coords.latitude,
              lng: fallbackPosition.coords.longitude,
              accuracy: fallbackPosition.coords.accuracy
            });
          },
          (fallbackError) => {
            const messages = {
              1: 'Location permission was denied. Search or pin your location manually.',
              2: 'Your location is unavailable. Check GPS and select a location manually.',
              3: 'GPS request timed out. Try again or select a location manually.'
            };
            reject(new Error(messages[fallbackError.code] || 'Could not detect your location. Select it manually.'));
          },
          { enableHighAccuracy: false, timeout: lowAccuracyTimeout, maximumAge: Math.max(maximumAge, 60_000) }
        );
      },
      { enableHighAccuracy: true, timeout: highAccuracyTimeout, maximumAge }
    );
  });
}
