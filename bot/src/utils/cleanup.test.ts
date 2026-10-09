import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFilesForLimit } from './cleanup.ts';
import { getStorageConfig } from './config.ts';

test('seleciona os arquivos mais antigos até ficar abaixo do limite', () => {
  const files = [
    { path: 'old', size: 60, mtimeMs: 1 },
    { path: 'middle', size: 30, mtimeMs: 2 },
    { path: 'new', size: 20, mtimeMs: 3 },
  ];
  assert.deepEqual(selectFilesForLimit(files, 120, 50).map(file => file.path), ['old', 'middle']);
});

test('não seleciona arquivos quando não há excesso ou limite é inválido', () => {
  const files = [{ path: 'file', size: 10, mtimeMs: 1 }];
  assert.deepEqual(selectFilesForLimit(files, 10, 20), []);
  assert.deepEqual(selectFilesForLimit(files, 10, 0), []);
});

test('identifica configuração de retenção inválida para bloquear a limpeza', () => {
  const oldLimit = process.env.MAX_STORAGE_GB;
  process.env.MAX_STORAGE_GB = 'não-numérico';
  assert.equal(getStorageConfig().valid, false);
  if (oldLimit === undefined) delete process.env.MAX_STORAGE_GB;
  else process.env.MAX_STORAGE_GB = oldLimit;
});
