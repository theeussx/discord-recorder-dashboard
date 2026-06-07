import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Mic, Radio, Users } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { mockRecordings } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/live")({
  head: () => ({ meta: [{ title: "Ao vivo — Wardizitto" }] }),
  component: LivePage,
});

function LivePage() {
  const live = mockRecordings[0];
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(40).fill(0.2));

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    const w = setInterval(() => {
      setLevels((arr) => arr.map(() => 0.15 + Math.random() * 0.85));
    }, 120);
    return () => {
      clearInterval(t);
      clearInterval(w);
    };
  }, []);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  return (
    <>
      <TopBar
        title="Sessão ao vivo"
        subtitle="Acompanhamento em tempo real"
        isLive
      />

      <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-live to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-live">
                <Radio size={11} /> Gravando
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {live.channelName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {live.guildId} · iniciado às {new Date(live.date).toLocaleTimeString("pt-BR")}
              </p>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Duração
              </div>
              <div className="mt-1 font-mono text-3xl tabular-nums text-foreground">
                {fmt(elapsed)}
              </div>
            </div>
          </div>

          {/* Waveform */}
          <div className="mt-8 flex h-28 items-center gap-1">
            {levels.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-gradient-to-t from-brand/30 to-brand transition-[height] duration-150"
                style={{ height: `${v * 100}%` }}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
            <Metric icon={Users} label="Participantes" value={String(live.participants.length)} />
            <Metric icon={Mic} label="Canais de áudio" value="estéreo" />
            <Metric icon={Activity} label="Taxa de amostragem" value="48 kHz" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Participantes ativos</h3>
          </div>
          <ul className="divide-y divide-border">
            {live.participants.map((p) => (
              <li key={p} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand/40 text-sm font-semibold text-brand-foreground">
                  {p.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 text-sm text-foreground">{p}</div>
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  falando
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mic;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-brand">
        <Icon size={15} />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
