import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLoaderProgress,
  cycleIndex,
  filterJournalByTopic,
  filterProjectsByCategory,
  formatLoaderCount,
  getAdjacentExplorationIndex,
  shouldSkipLoader,
  validateInquiryForm,
} from './portfolioHelpers';
import { EXPLORATIONS, FEATURED_PROJECTS, JOURNAL_ENTRIES } from '../data/portfolioData';

test('formatLoaderCount zero-pads and clamps 0..100', () => {
  assert.equal(formatLoaderCount(0), '000');
  assert.equal(formatLoaderCount(7), '007');
  assert.equal(formatLoaderCount(42), '042');
  assert.equal(formatLoaderCount(100), '100');
  assert.equal(formatLoaderCount(145), '100');
  assert.equal(formatLoaderCount(-5), '000');
});

test('computeLoaderProgress computes percentage across 2700ms duration', () => {
  assert.equal(computeLoaderProgress(0, 2700), 0);
  assert.equal(computeLoaderProgress(1350, 2700), 50);
  assert.equal(computeLoaderProgress(2700, 2700), 100);
  assert.equal(computeLoaderProgress(3500, 2700), 100);
});

test('cycleIndex wraps cleanly forwards and backwards', () => {
  assert.equal(cycleIndex(0, 4, 1), 1);
  assert.equal(cycleIndex(3, 4, 1), 0);
  assert.equal(cycleIndex(0, 4, -1), 3);
  assert.equal(cycleIndex(0, 0, 1), 0);
});

test('filterProjectsByCategory returns expected subsets', () => {
  assert.equal(filterProjectsByCategory(FEATURED_PROJECTS, 'All').length, 4);
  const motion = filterProjectsByCategory(FEATURED_PROJECTS, 'Motion & 3D');
  assert.equal(motion.length, 1);
  assert.equal(motion[0].title, 'Automotive Motion');
});

test('filterJournalByTopic filters accurately', () => {
  assert.equal(filterJournalByTopic(JOURNAL_ENTRIES, 'All').length, 4);
  assert.equal(filterJournalByTopic(JOURNAL_ENTRIES, 'Motion').length, 1);
});

test('getAdjacentExplorationIndex navigates cyclically', () => {
  const firstId = EXPLORATIONS[0].id;
  const lastId = EXPLORATIONS[EXPLORATIONS.length - 1].id;
  assert.equal(getAdjacentExplorationIndex(EXPLORATIONS, firstId, -1), EXPLORATIONS.length - 1);
  assert.equal(getAdjacentExplorationIndex(EXPLORATIONS, lastId, 1), 0);
});

test('shouldSkipLoader honors autostart=1 and reduced motion', () => {
  assert.equal(shouldSkipLoader('?autostart=1', false), true);
  assert.equal(shouldSkipLoader('', true), true);
  assert.equal(shouldSkipLoader('', false), false);
});

test('validateInquiryForm rejects invalid inputs and accepts valid submissions', () => {
  const bad = validateInquiryForm({ name: '', email: 'not-email', message: 'hi' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.message);

  const good = validateInquiryForm({
    name: 'Elena Vance',
    email: 'elena@studio.com',
    message: 'Interested in collaborating on a product launch.',
  });
  assert.equal(good.valid, true);
  assert.deepEqual(good.errors, {});
});
