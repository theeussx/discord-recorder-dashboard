import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { resolveAuthorizedAudioPath } from './paths.ts';

test('aceita somente áudio dentro de recordings ou clips', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-test-'));
  process.env.STORAGE_PATH = path.join(root, 'recordings');
  fs.mkdirSync(path.join(root, 'recordings'), { recursive: true });
  fs.writeFileSync(path.join(root, 'recordings', 'ok.mp3'), 'audio');
  assert.equal(resolveAuthorizedAudioPath(path.join(root, 'recordings', 'ok.mp3')), path.join(root, 'recordings', 'ok.mp3'));
  assert.equal(resolveAuthorizedAudioPath(path.join(root, '.env')), null);
  assert.equal(resolveAuthorizedAudioPath(path.join(root, 'recordings', '..', '.env')), null);
  assert.equal(resolveAuthorizedAudioPath(path.join(root, 'recordings', 'ok.txt')), null);
  fs.rmSync(root, { recursive: true, force: true });
});
