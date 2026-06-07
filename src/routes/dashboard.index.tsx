import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  HardDrive,
  Mic,
  Scissors,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { StatCard } from "@/components/stat-card";
import { AudioPlayer } from "@/components/audio-player";
import { mockClips, mockRecordings, mockStats } from "@/lib/mock-data";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Visão geral — Wardizitto Recordings" }],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const isLive = true;

  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setLoading(false);
    }, 600);
  }

  const usedPct = Math.min(
    100,
    (mockStats.storageUsedBytes / mockStats.storageQuotaBytes) * 100,
  );
  const recent = mockRecordings.slice(0, 5);
  const recentClips = mockClips.slice(0, 4);

  return (
    <>
      <TopBar
        title="Visão geral"
        subtitle="Resumo das sessões e do armazenamento"
        isLive={isLive}
        lastRefresh={lastRefresh}
        onRefresh={refresh}
        loading={loading}
      />

      <div className="space-y-8 px-5 py-6 md:px-8 md:py-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Gravações"
            value={String(mockStats.totalRecordings)}
            hint="Últimos 30 dias"
            icon={Mic}
            accent="brand"
          />
          <StatCard
            label="Clipes"
            value={String(mockStats.totalClips)}
            hint="Destaques salvos"
            icon={Scissors}
            accent="success"
          />
          <StatCard
            label="Participantes"
            value={String(mockStats.totalUsers)}
            hint="Únicos identificados"
            icon={Users}
            accent="warning"
          />
          <StatCard
            label="Uptime do bot"
            value={`${mockStats.uptimeHours}h`}
            hint="Sem interrupções"
            icon={Activity}
            accent="brand"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {/* Storage */}
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Armazenamento
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {formatBytes(mockStats.storageUsedBytes)}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  de {formatBytes(mockStats.storageQuotaBytes)} disponíveis
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-brand">
                <HardDrive size={18} />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand/60 transition-all"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{usedPct.toFixed(1)}% usado</span>
                <span className="inline-flex items-center gap-1 text-success">
                  <TrendingUp size={12} /> +4.2% esta semana
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div>
                <div className="text-muted-foreground">Maior arquivo</div>
                <div className="mt-0.5 font-medium text-foreground">
                  {formatBytes(
                    Math.max(...mockRecordings.map((r) => r.size)),
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Média / sessão</div>
                <div className="mt-0.5 font-medium text-foreground">
                  {formatBytes(
                    mockStats.storageUsedBytes / mockStats.totalRecordings,
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent recordings */}
          <div className="rounded-2xl border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Gravações recentes</h2>
                <p className="text-xs text-muted-foreground">
                  Sessões capturadas nos últimos dias
                </p>
              </div>
              <Link
                to="/dashboard/recordings"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand transition hover:gap-2"
              >
                Ver todas <ArrowRight size={13} />
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recent.map((rec) => (
                <li
                  key={rec.id}
                  className="flex items-center gap-4 px-5 py-3 transition hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {rec.channelName}
                    </div>
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
                      <div
                        key={p}
                        className="grid h-6 w-6 place-items-center rounded-full border border-card bg-accent text-[10px] font-semibold uppercase text-foreground"
                        style={{ zIndex: 10 - i }}
                      >
                        {p.slice(0, 1)}
                      </div>
                    ))}
                    {rec.participants.length > 3 && (
                      <div className="grid h-6 w-6 place-items-center rounded-full border border-card bg-muted text-[10px] font-medium text-muted-foreground">
                        +{rec.participants.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="w-28">
                    <AudioPlayer filename={rec.filename} compact />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Clips strip */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Clipes em destaque</h2>
              <p className="text-xs text-muted-foreground">
                Momentos curtos extraídos das gravações
              </p>
            </div>
            <Link
              to="/dashboard/clips"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand transition hover:gap-2"
            >
              Abrir biblioteca <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentClips.map((clip) => (
              <div
                key={clip.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {clip.filename}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDuration(clip.duration)} · {formatBytes(clip.size)}
                    </div>
                  </div>
                  <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    clip
                  </span>
                </div>
                <div className="mt-4">
                  <AudioPlayer filename={clip.filename} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
