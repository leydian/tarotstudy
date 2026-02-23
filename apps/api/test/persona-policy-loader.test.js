import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPersonaPolicy, getPersonaPolicyPathForTest } from '../src/persona-policy-loader.js';

test('persona onepager policy loads with required structure', () => {
  const policy = loadPersonaPolicy();
  assert.equal(policy.sourcePath, 'docs/persona-onepager.md');
  assert.ok(/^[a-f0-9]{8}$/.test(policy.policyVersion));
  assert.deepEqual(policy.renderPriority, ['readingModel', 'tonePayload', 'readingV3', 'summary']);
  assert.equal(policy.personaResolution.defaultPersona.group, 'user');
  assert.equal(policy.personaResolution.defaultPersona.id, 'beginner');
  assert.ok(policy.personaResolution.supportedPersonas.length >= 13);
  assert.ok(policy.roles.tarotLeaderPrompt.includes('타로 마스터'));
  assert.ok(policy.roles.learningLeaderPrompt.includes('학습 코치'));
});

test('persona policy file path points to docs onepager', () => {
  const policyPath = getPersonaPolicyPathForTest();
  assert.ok(policyPath.endsWith('/docs/persona-onepager.md'));
});
