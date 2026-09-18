import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLaneCompatible, canCrossLane, LaneFirewallError, type LaneBridge } from '../src/lane.ts';

const bridge = (over: Partial<LaneBridge> = {}): LaneBridge => ({
  bridge_id: 'bridge_test',
  from_lane: 'LANE_B',
  to_lane: 'LANE_A',
  authority_ref: 'MOU-2026-01',
  reference_description: 'Business Interests registry reference',
  declared_at: '2026-09-10T00:00:00Z',
  ...over,
});

test('same-lane operations pass', () => {
  assert.doesNotThrow(() => assertLaneCompatible('LANE_A', 'LANE_A'));
  assert.doesNotThrow(() => assertLaneCompatible('LANE_B', 'LANE_B'));
});

test('cross-lane without a bridge is refused', () => {
  assert.throws(() => assertLaneCompatible('LANE_B', 'LANE_A'), LaneFirewallError);
  assert.throws(() => assertLaneCompatible('LANE_A', 'LANE_B'), LaneFirewallError);
});

test('UNCLASSIFIED is not a free pass in either direction', () => {
  assert.equal(canCrossLane('UNCLASSIFIED', 'LANE_A'), false);
  assert.equal(canCrossLane('LANE_B', 'UNCLASSIFIED'), false);
});

test('a bridge naming this exact crossing permits it', () => {
  assert.doesNotThrow(() => assertLaneCompatible('LANE_B', 'LANE_A', bridge()));
});

test('a bridge for a different pair does not permit this crossing', () => {
  assert.throws(
    () => assertLaneCompatible('LANE_B', 'PHILANTHROPIC', bridge()),
    /authorizes LANE_B -> LANE_A, not this crossing/,
  );
});

test('a bridge with no authority reference authorizes nothing', () => {
  assert.throws(
    () => assertLaneCompatible('LANE_B', 'LANE_A', bridge({ authority_ref: '   ' })),
    /carries no authority reference/,
  );
});

test('the private-to-enterprise message names the estate risk', () => {
  assert.throws(() => assertLaneCompatible('LANE_B', 'LANE_A'), /requires an express instrument/);
  assert.throws(() => assertLaneCompatible('PERSONAL', 'LANE_A'), /requires an express instrument/);
});
