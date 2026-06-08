import { createServerFn } from '@tanstack/react-start';
import {
  fetchRecordings, fetchClips, fetchStats, getFileUrl
} from './bot-api.server';

export const getRecordingsFn = createServerFn({ method: 'GET' })
  .handler(async () => fetchRecordings());

export const getClipsFn = createServerFn({ method: 'GET' })
  .handler(async () => fetchClips());

export const getStatsFn = createServerFn({ method: 'GET' })
  .handler(async () => fetchStats());

export const getFileUrlFn = createServerFn({ method: 'GET' })
  .validator((d: { type: 'recordings' | 'clips'; filename: string }) => d)
  .handler(async ({ data }) => getFileUrl(data.type, data.filename));
