import path from 'node:path';

function positiveNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getStoragePath(): string {
  return path.resolve(process.env.STORAGE_PATH?.trim() || './recordings');
}

export function getClipsPath(): string {
  return path.join(path.dirname(getStoragePath()), 'clips');
}

export function getStorageConfig() {
  const maxStorageRaw = process.env.MAX_STORAGE_GB?.trim();
  const autoDeleteRaw = process.env.AUTO_DELETE_DAYS?.trim();
  const maxStorageValid = maxStorageRaw === undefined || (Number.isFinite(Number(maxStorageRaw)) && Number(maxStorageRaw) > 0);
  const autoDeleteValid = autoDeleteRaw === undefined || (Number.isFinite(Number(autoDeleteRaw)) && Number(autoDeleteRaw) > 0);
  const maxStorageGb = positiveNumber(process.env.MAX_STORAGE_GB, 4);
  const autoDeleteDays = positiveNumber(process.env.AUTO_DELETE_DAYS, 10);
  return {
    valid: maxStorageValid && autoDeleteValid,
    maxStorageGb,
    maxStorageBytes: maxStorageGb * 1024 ** 3,
    autoDeleteDays,
  };
}

export function getDashboardUrl(): string | undefined {
  const value = process.env.DASHBOARD_URL?.trim();
  return value || undefined;
}

export function getBotApiToken(): string | undefined {
  const value = process.env.BOT_API_TOKEN?.trim();
  return value || undefined;
}
