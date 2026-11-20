export function isValidCoordinate(location) {
  return location?.lat !== null
    && location?.lat !== undefined
    && location?.lat !== ''
    && location?.lng !== null
    && location?.lng !== undefined
    && location?.lng !== ''
    && Number.isFinite(Number(location.lat))
    && Number.isFinite(Number(location?.lng))
    && Number(location.lat) >= -90
    && Number(location.lat) <= 90
    && Number(location.lng) >= -180
    && Number(location.lng) <= 180;
}

export function distanceInKm(from, to) {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(Number(to.lat) - Number(from.lat));
  const longitudeDelta = radians(Number(to.lng) - Number(from.lng));
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(Number(from.lat)))
    * Math.cos(radians(Number(to.lat)))
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
  if (!isValidCoordinate(location) || !Number.isFinite(radiusKm) || radiusKm < 0) return [];
  const required = requiredSkills.map((skill) => skill.toLowerCase());
  return workers
    .filter((worker) => worker.availability_status === 'available'
      && worker.location_sharing_enabled
      && isValidCoordinate(worker.location)
      && (!required.length || required.some((skill) => (worker.skills || []).some((candidate) => candidate.toLowerCase().includes(skill)))))
    .map((worker) => ({ ...worker, distanceKm: distanceInKm(location, worker.location) }))
    .filter((worker) => worker.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm || (b.rating || 0) - (a.rating || 0));
}
