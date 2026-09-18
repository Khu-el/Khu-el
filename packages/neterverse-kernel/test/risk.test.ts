import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requiresHumanApproval,
  mayExecuteUnattended,
  strictestRisk,
  riskAtLeast,
  buildApprovalRequest,
} from '../src/risk.ts';

test('R0 and R1 work proceeds without a human', () => {
  assert.equal(requiresHumanApproval('research', 'R0'), false);
  assert.equal(requiresHumanApproval('draft_code', 'R1'), false);
});

test('R2 may be prepared but R3 and above stop at the gate', () => {
  assert.equal(requiresHumanApproval('prepare_draft', 'R2'), false);
  assert.equal(requiresHumanApproval('anything', 'R3'), true);
  assert.equal(requiresHumanApproval('anything', 'R4'), true);
});

test('a human-only action is caught even when mis-tiered as R0', () => {
  // Mis-tiering is the likeliest failure, so the action name is checked independently.
  for (const action of ['send', 'publish', 'file', 'sign', 'move_money', 'change_beneficiary']) {
    assert.equal(requiresHumanApproval(action, 'R0'), true, `${action} must require approval`);
  }
});

test('no ceiling makes R3 or R4 autonomous', () => {
  assert.equal(mayExecuteUnattended('R3', 'R4'), false);
  assert.equal(mayExecuteUnattended('R4', 'R4'), false);
});

test('an agent executes only up to its own ceiling', () => {
  assert.equal(mayExecuteUnattended('R1', 'R1'), true);
  assert.equal(mayExecuteUnattended('R2', 'R1'), false);
});

test('classification never rounds down', () => {
  assert.equal(strictestRisk('R0', 'R2', 'R1'), 'R2');
  assert.equal(strictestRisk('R0'), 'R0');
  assert.equal(strictestRisk('R4', 'R0'), 'R4');
  assert.equal(riskAtLeast('R2', 'R3'), false);
});

test('a built approval request starts PENDING and grants nothing', () => {
  const req = buildApprovalRequest({
    approval_id: 'apr_1',
    task_id: 'tsk_1',
    requested_action: 'publish',
    lane: 'LANE_A',
    entity: 'NTE',
    capacity: 'Minister / Authorized Representative',
    risk_tier: 'R3',
    requested_by: 'CLAUDE_CODE',
    required_approver: 'principal',
    supporting_sources: [],
    impact: 'public page goes live',
    rollback: 'revert commit and redeploy',
  });
  assert.equal(req.status, 'PENDING');
  assert.equal(req.approved_at, null);
  assert.equal(req.evidence, null);
});
