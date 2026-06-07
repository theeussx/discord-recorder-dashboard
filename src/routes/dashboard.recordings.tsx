import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, Hash, Users } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { AudioPlayer } from "@/components/audio-player";
import { mockRecordings } from "@/lib/mock-data";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";

export const Route = createFileRoute("/dashboard/recordings")({
  head: () => ({ meta: [{ title: "Gravações — Wardizitto" }] }),
  component: RecordingsPage,
});

function RecordingsPage() {
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return mockRecordings;
    return mockRecordings.filter(
      (r) =>
        r.filename.toLowerCase().includes(q) ||
        r.channelName.toLowerCase().includes(q) ||
        r.guildId.toLowerCase().includes(q) ||
        r.participants.some((p) => p.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <>
      <TopBar
        title="Gravações"
        subtitle={`${filtered.length} de ${mockRecordings.length} sessões`}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por canal, guilda ou participante..."
        isLive={false}
        lastRefresh={lastRefresh}
        loading={loading}
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => {
            setLastRefresh(new Date());
            setLoading(false);
          }, 500);
        }}
      />

      <div className="px-5 py-6 md:px-8 md:py-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_1.2fr_0.8fr_auto] gap-4 border-b border-border bg-muted/30 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
            <span>Arquivo</span>
            <span>Canal / Guilda</span>
            <span>Duração</span>
            <span>Participantes</span>
            <span className="text-right">Tamanho</span>
            <span className="w-32 text-right">Ações</span>
          </div>

          <ul className="divide-y divide-border">
            {filtered.map((rec) => (
              <li
                key={rec.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-accent/30 md:grid-cols-[1.6fr_1fr_0.8fr_1.2fr_0.8fr_auto] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm text-foreground">
                    {rec.filename}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(rec.date)}
                  </div>
                </div>

                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium text-foreground">
                    {rec.channelName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Hash size={11} /> {rec.guildId}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={13} />
                  <span className="tabular-nums">{formatDuration(rec.duration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {rec.participants.slice(0, 4).map((p, i) => (
                      <div
                        key={p}
                        className="grid h-6 w-6 place-items-center rounded-full border border-card bg-accent text-[10px] font-semibold uppercase text-foreground"
                        style={{ zIndex: 10 - i }}
                        title={p}
                      >
                        {p.slice(0, 1)}
                      </div>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Users size={10} /> {rec.participants.length}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground md:text-right">
                  {formatBytes(rec.size)}
                </div>

                <div className="md:w-32">
                  <AudioPlayer filename={rec.filename} compact />
                </div>
              </li>
            ))}
          </ul>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma gravação encontrada.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
