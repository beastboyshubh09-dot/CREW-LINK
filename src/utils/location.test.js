import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceInKm, findNearbyWorkers, formatDistance, isValidCoordinate } from './location.js';

test('validates Indian coordinates and rejects invalid coordinate ranges', () => {
  const exampleIndianCities = [
    { lat: 12.9716, lng: 77.5946 },
    { lat: 12.9141, lng: 74.856 },
    { lat: 19.076, lng: 72.8777 },
    { lat: 13.0827, lng: 80.2707 },
    { lat: 17.385, lng: 78.4867 },
    { lat: 28.6139, lng: 77.209 }
  ];
  assert.ok(exampleIndianCities.every(isValidCoordinate));
  assert.equal(isValidCoordinate({ lat: 91, lng: 74 }), false);
  assert.equal(isValidCoordinate({ lat: null, lng: 74 }), false);
  assert.equal(isValidCoordinate({ lat: 12, lng: Infinity }), false);
});

test('calculates straight-line distance and formats metric distances', () => {
  const distance = distanceInKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9141, lng: 74.856 });
  assert.ok(distance > 290 && distance < 310);
  assert.equal(formatDistance(0.42), '420 m');
  assert.equal(formatDistance(2.24), '2.2 km');
});

test('returns only available, opted-in, skilled workers inside the radius in proximity order', () => {
  const workers = [
    { id: 'far', availability_status: 'available', location_sharing_enabled: true, location: { lat: 12.99, lng: 77.59 }, skills: ['Furniture shifting'], rating: 5 },
    { id: 'near', availability_status: 'available', location_sharing_enabled: true, location: { lat: 12.972, lng: 77.595 }, skills: ['Furniture shifting'], rating: 4 },
    { id: 'offline', availability_status: 'unavailable', location_sharing_enabled: true, location: { lat: 12.972, lng: 77.595 }, skills: ['Furniture shifting'] },
    { id: 'no-consent', availability_status: 'available', location_sharing_enabled: false, location: { lat: 12.972, lng: 77.595 }, skills: ['Furniture shifting'] }
  ];
  assert.deepEqual(findNearbyWorkers(workers, { lat: 12.9716, lng: 77.5946 }, 2, ['furniture shifting']).map(({ id }) => id), ['near']);
});

test('can identify four eligible workers in a city-scale radius', () => {
  const location = { lat: 12.9141, lng: 74.856 };
  const workers = Array.from({ length: 4 }, (_, index) => ({
    id: `mangaluru-${index}`,
    availability_status: 'available',
    location_sharing_enabled: true,
    location: { lat: location.lat + index * 0.001, lng: location.lng },
    skills: ['Furniture shifting']
  }));
  assert.equal(findNearbyWorkers(workers, location, 5, ['Furniture shifting']).length, 4);
});
