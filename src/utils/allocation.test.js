import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAllocationPlan } from './allocation.js';

test('evaluates full allocation when enough workers are available', () => {
  const target = { lat: 12.9716, lng: 77.5946 };
  const workers = [
    { id: 'w1', name: 'Ravi', rating: 4.9, jobs: 50, location: { lat: 12.972, lng: 77.595 } },
    { id: 'w2', name: 'Nikhil', rating: 4.8, jobs: 40, location: { lat: 12.973, lng: 77.596 } },
    { id: 'w3', name: 'Arjun', rating: 4.7, jobs: 30, location: { lat: 12.974, lng: 77.597 } }
  ];

  const plan = evaluateAllocationPlan({
    requiredWorkers: 2,
    eligibleWorkers: workers,
    targetLocation: target,
    searchRadiusKm: 10
  });

  assert.equal(plan.status, 'ready');
  assert.equal(plan.isFull, true);
  assert.equal(plan.allocatedCount, 2);
  assert.equal(plan.shortfall, 0);
  assert.equal(plan.selectedCrew.length, 2);
  assert.equal(plan.selectedCrew[0].id, 'w1');
});

test('evaluates partial allocation and offers actionable fallback options when shortfall occurs', () => {
  const target = { lat: 12.9716, lng: 77.5946 };
  const workers = [
    { id: 'w1', name: 'Ravi', rating: 4.9, jobs: 50, location: { lat: 12.972, lng: 77.595 } }
  ];

  const plan = evaluateAllocationPlan({
    requiredWorkers: 3,
    eligibleWorkers: workers,
    targetLocation: target,
    searchRadiusKm: 10
  });

  assert.equal(plan.status, 'partial');
  assert.equal(plan.isFull, false);
  assert.equal(plan.allocatedCount, 1);
  assert.equal(plan.shortfall, 2);
  assert.equal(plan.options.length, 3);
  assert.equal(plan.options[0].type, 'partial_dispatch');
  assert.equal(plan.options[1].type, 'expand_radius');
  assert.equal(plan.options[1].suggestedRadiusKm, 15);
});
