import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Activity, HardDrive, Mic, Scissors, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { TopBar } from '@/components/top-bar';
import { StatCard } from '@/components/stat-card';
import { AudioPlayer } from '@/components/audio-player';
import { formatBytes, formatDate, formatDuration } from '@/lib/format';
import { getRecordingsFn, getClipsFn, getStatsFn } from '@/lib/bot-functions';
import type { Recording, Clip } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({ meta: [{ title: 'Visão geral — Wardizitto Recordings' }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [clips, setClips]           = useState<Clip[]>([]);
  const [stats, setStats]           = useState({ totalRecordings: 0, totalUsers: 0, storageUsed: '—', totalClips: 0 });
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function load() {
    setLoading(true);
    try {
      const [recs, cls, st] = await Promise.all([getRecordingsFn(), getClipsFn(), getStatsFn()]);
      setRecordings(recs);
      setClips(cls);
      setStats({ ...st, totalClips: cls.length });
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const BOT_BASE = import.meta.env.VITE_BOT_API_BASE ?? '';
  const recent      = recordings.slice(0, 5);
  const recentClips = clips.slice(0, 4);

  // Calcula % de storage — extrai número de strings como "171.85 MB"
  const storageBytes = (() => {
    const m = stats.storageUsed.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const u = m[2].toUpperCase();
    const map: Record<string, number> = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3 };
    return n * (map[u] ?? 1);
  })();
  const quotaBytes = 3 * 1024 ** 3; // 3GB
  const usedPct = Math.min(100, (storageBytes / quotaBytes) * 100);

  return (
    <>
      <TopBar
        title="Visão geral"
        subtitle="Resumo das sessões e do armazenamento"
        isLive={false}
        lastRefresh={lastRefresh}
        onRefresh={load}
        loading={loading}
      />

      <div className="space-y-8 px-5 py-6 md:px-8 md:py-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gravações"    value={String(stats.totalRecordings)} hint="Total salvas"         icon={Mic}       accent="brand"   />
          <StatCard label="Clipes"       value={String(stats.totalClips)}      hint="Destaques salvos"     icon={Scissors}  accent="success" />
          <StatCard label="Participantes" value={String(stats.totalUsers)}      hint="Únicos identificados" icon={Users}     accent="warning" />
          <StatCard label="Armazenamento" value={stats.storageUsed}             hint="de 3 GB"              icon={HardDrive} accent="brand"   />
        </section>

        {/* Barra de storage */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-brand" />
              <span className="text-sm font-medium text-foreground">Armazenamento</span>
            </div>
            <span className="text-xs text-muted-foreground">{stats.storageUsed} de 3 GB</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${usedPct > 80 ? 'bg-red-500' : 'bg-brand'}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{usedPct.toFixed(1)}% utilizado</p>
        </section>

        {/* Gravações recentes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Gravações recentes</h2>
              <p className="text-xs text-muted-foreground">Sessões capturadas recentemente</p>
            </div>
            <Link to="/dashboard/recordings" className="inline-flex items-center gap-1 text-xs font-medium text-brand transition hover:gap-2">
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {recent.length === 0 && !loading && (
                <li className="py-10 text-center text-sm text-muted-foreground">Nenhuma gravação ainda.</li>
              )}
              {recent.map(rec => (
                <li key={rec.id} className="flex items-center gap-4 px-5 py-3 transition hover:bg-accent/40">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{rec.channelName}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{rec.guildId}</span>
                      <span>·</span>
                      <span>{formatDate(rec.date)}</span>
                      <span>·</span>
                      <span>{formatDuration(rec.duration)}</span>
                    </div>
                  </div>
                  <div className="hidden items-center -space-x-1.5 sm:flex">
                    {rec.participants.slice(0, 3).map((p, i) => (
                      <div key={p} className="grid h-6 w-6 place-items-center rounded-full border border-card bg-accent text-[10px] font-semibold uppercase text-foreground" style={{ zIndex: 10 - i }}>{p.slice(0, 1)}</div>
                    ))}
                    {rec.participants.length > 3 && (
                      <div className="grid h-6 w-6 place-items-center rounded-full border border-card bg-muted text-[10px] font-medium text-muted-foreground">+{rec.participants.length - 3}</div>
                    )}
                  </div>
                  <div className="w-28">
                    <AudioPlayer filename={rec.filename} src={`${BOT_BASE}/api/recordings/file/${encodeURIComponent(rec.filename)}`} compact />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Clips recentes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Clipes em destaque</h2>
              <p className="text-xs text-muted-foreground">Momentos curtos extraídos das gravações</p>
            </div>
            <Link to="/dashboard/clips" className="inline-flex items-center gap-1 text-xs font-medium text-brand transition hover:gap-2">
              Abrir biblioteca <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentClips.length === 0 && !loading && (
              <div className="col-span-4 py-10 text-center text-sm text-muted-foreground">Nenhum clip ainda.</div>
            )}
            {recentClips.map(clip => (
              <div key={clip.id} className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:border-brand/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{clip.filename}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDuration(clip.duration)} · {formatBytes(clip.size)}</div>
                  </div>
                  <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">clip</span>
                </div>
                <div className="mt-4">
                  <AudioPlayer filename={clip.filename} src={`${BOT_BASE}/api/clips/file/${encodeURIComponent(clip.filename)}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
