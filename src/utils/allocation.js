import { distanceInKm, extractCoordinates, formatDistance } from './location.js';

/**
 * Calculates allocation feasibility and recommends optimal crew options
 * when full crew count cannot be satisfied within preferred search radius.
 */
export function evaluateAllocationPlan({
  requiredWorkers,
  eligibleWorkers,
  targetLocation,
  searchRadiusKm = 15
}) {
  const target = extractCoordinates(targetLocation);
  if (!target || !Array.isArray(eligibleWorkers)) {
    return {
      status: 'invalid_input',
      allocatedCount: 0,
      shortfall: requiredWorkers,
      selectedCrew: [],
      options: []
    };
  }

  // Sort eligible workers by score: Proximity (lowest km), highest rating, highest completed jobs
  const rankedWorkers = eligibleWorkers
    .map((w) => {
      const wCoords = extractCoordinates(w.location);
      const dist = wCoords ? distanceInKm(target, wCoords) : 999;
      return {
        ...w,
        distanceKm: dist,
        score: (w.rating || 5.0) * 10 + (w.jobs || 0) * 0.1 - dist * 0.5
      };
    })
    .sort((a, b) => b.score - a.score);

  const selectedCrew = rankedWorkers.slice(0, requiredWorkers);
  const allocatedCount = selectedCrew.length;
  const shortfall = Math.max(0, requiredWorkers - allocatedCount);

  const isFull = allocatedCount >= requiredWorkers;

  const options = [];
  if (!isFull) {
    // 1. Partial allocation option
    options.push({
      type: 'partial_dispatch',
      label: `Proceed with ${allocatedCount} available helper${allocatedCount === 1 ? '' : 's'}`,
      description: `Dispatches available workers now. Price adjusts automatically to ₹${allocatedCount * 300}/hr.`,
      availableCount: allocatedCount,
      adjustedWorkers: allocatedCount
    });

    // 2. Expand search radius
    options.push({
      type: 'expand_radius',
      label: `Expand search to ${Math.round(searchRadiusKm * 1.5)} km`,
      description: 'Increases the search radius to identify more verified workers in adjacent neighborhoods.',
      suggestedRadiusKm: Math.round(searchRadiusKm * 1.5)
    });

    // 3. Reschedule
    options.push({
      type: 'reschedule',
      label: 'Choose an alternative time slot',
      description: 'Workers often have greater availability in morning or afternoon shifts.'
    });
  }

  return {
    status: isFull ? 'ready' : 'partial',
    isFull,
    allocatedCount,
    shortfall,
    selectedCrew,
    options
  };
}
