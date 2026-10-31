import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = new URL('../scripts/cli.mjs', import.meta.url).pathname;
const SAMPLE = new URL('../sample-data/sample-workspace.json', import.meta.url).pathname;

test('cli summary returns the six playbook steps and buyer language', () => {
  const out = JSON.parse(execFileSync('node', [CLI, 'summary', SAMPLE], { encoding: 'utf8' }));
  assert.equal(out.playbook.length, 6);
  assert.ok(out.buyerLanguage.phrases.length > 0);
});

test('cli audit-profile exits 1 on the deliberately weak sample profile', () => {
  const r = spawnSync('node', [CLI, 'audit-profile', SAMPLE], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Profile score: \d+\/100/);
});

test('cli lint-post fails a post with no hook and passes a clean one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gtm-'));
  const good = join(dir, 'good.md');
  writeFileSync(good, 'Likes but no leads?\n\nShort para.\n\nWhat would you add?\n');
  assert.equal(spawnSync('node', [CLI, 'lint-post', SAMPLE, good]).status, 0);
  const bad = join(dir, 'bad.md');
  writeFileSync(bad, '\n\nbody only');
  assert.equal(spawnSync('node', [CLI, 'lint-post', SAMPLE, bad]).status, 1);
});
