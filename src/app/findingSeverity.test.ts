import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countFindings,
  dominantFindingSeverity,
  formatFindingCounts,
  normalizeFindingSeverity,
  normalizeFindings,
} from './findingSeverity.ts';

test('counts errors, warnings, and informational findings separately', () => {
  const findings = [
    { severity: 'error' },
    { severity: 'WARNING' },
    { severity: 'info' },
    { severity: 'error' },
  ];

  assert.deepEqual(countFindings(findings), {
    errors: 2,
    warnings: 1,
    informational: 1,
    total: 4,
  });
  assert.equal(dominantFindingSeverity(countFindings(findings)), 'error');
  assert.equal(formatFindingCounts(countFindings(findings)), '2 errors · 1 warning · 1 informational (4 total)');
});

test('normalizes case and informational aliases while defaulting legacy missing values to error', () => {
  assert.equal(normalizeFindingSeverity(' Warning '), 'warning');
  assert.equal(normalizeFindingSeverity('INFORMATIONAL'), 'info');
  assert.equal(normalizeFindingSeverity(undefined), 'error');
  assert.deepEqual(normalizeFindings([{ message: 'legacy' }, { severity: 'INFO' }]), [
    { message: 'legacy', severity: 'error' },
    { severity: 'info' },
  ]);
});

test('counts empty findings as a clean analysis', () => {
  const counts = countFindings([]);
  assert.deepEqual(counts, {
    errors: 0,
    warnings: 0,
    informational: 0,
    total: 0,
  });
  assert.equal(dominantFindingSeverity(counts), null);
  assert.equal(formatFindingCounts(counts), 'No findings');
});