import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubRepoSlug,
  sanitizeExternalRepoUrl,
  buildGitHubOpenUrl,
  buildGitHubForkUrl,
  mapWorkflowRunToBuildStatus,
  createForkedProjectPayload,
} from '../src/utils/projectRepoUtils.ts';

test('parseGitHubRepoSlug parses HTTPS and SSH repository URLs', () => {
  assert.deepEqual(parseGitHubRepoSlug('https://github.com/Supremeai-bd/supremeai'), {
    owner: 'Supremeai-bd',
    repo: 'supremeai',
    slug: 'Supremeai-bd/supremeai',
    normalizedUrl: 'https://github.com/Supremeai-bd/supremeai',
  });
  assert.equal(parseGitHubRepoSlug('javascript:alert(1)'), null);
});

test('sanitizeExternalRepoUrl blocks non-http protocols', () => {
  assert.equal(sanitizeExternalRepoUrl('javascript:alert(1)'), null);
  assert.equal(
    sanitizeExternalRepoUrl('https://github.com/org/repo'),
    'https://github.com/org/repo'
  );
});

test('buildGitHubOpenUrl and buildGitHubForkUrl format links for default and feature branches', () => {
  assert.equal(
    buildGitHubOpenUrl('https://github.com/Supremeai-bd/supremeai', 'main'),
    'https://github.com/Supremeai-bd/supremeai'
  );
  assert.equal(
    buildGitHubOpenUrl('https://github.com/Supremeai-bd/supremeai', 'release/v2'),
    'https://github.com/Supremeai-bd/supremeai/tree/release%2Fv2'
  );
  assert.equal(
    buildGitHubForkUrl('https://github.com/Supremeai-bd/supremeai'),
    'https://github.com/Supremeai-bd/supremeai/fork'
  );
});

test('mapWorkflowRunToBuildStatus maps GitHub Actions states accurately', () => {
  assert.equal(mapWorkflowRunToBuildStatus(undefined), 'unknown');
  assert.equal(mapWorkflowRunToBuildStatus({ status: 'queued', conclusion: null }), 'building');
  assert.equal(
    mapWorkflowRunToBuildStatus({ status: 'completed', conclusion: 'success' }),
    'passing'
  );
  assert.equal(
    mapWorkflowRunToBuildStatus({ status: 'completed', conclusion: 'failure' }),
    'failing'
  );
});

test('createForkedProjectPayload creates clean fork metadata', () => {
  const payload = createForkedProjectPayload(
    {
      id: 'p1',
      name: 'supremeai',
      repoUrl: 'https://github.com/Supremeai-bd/supremeai',
      branch: 'main',
      description: 'Core engine',
      language: 'TypeScript',
      stars: 10,
      lastSynced: 123,
      aiReviewStatus: 'reviewed',
      buildStatus: 'passing',
    },
    'dev-user'
  );
  assert.equal(payload.name, 'supremeai-fork');
  assert.equal(payload.repoUrl, 'https://github.com/dev-user/supremeai');
  assert.equal(payload.forkedFrom, 'Supremeai-bd/supremeai');
  assert.equal(payload.buildStatus, 'passing');
});
