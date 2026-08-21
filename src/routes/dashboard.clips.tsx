import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Scissors, RefreshCw } from 'lucide-react';
import { TopBar } from '@/components/top-bar';
import { AudioPlayer } from '@/components/audio-player';
import { formatBytes, formatDate, formatDuration } from '@/lib/format';
import { getClipsFn } from '@/lib/bot-functions';
import type { Clip } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/clips')({
  head: () => ({ meta: [{ title: 'Clipes — Wardizitto' }] }),
  component: ClipsPage,
});

function ClipsPage() {
  const [clips, setClips]     = useState<Clip[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getClipsFn();
      setClips(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clips;
    return clips.filter(c => c.filename.toLowerCase().includes(q));
  }, [search, clips]);

  return (
    <>
      <TopBar
        title="Clipes"
        subtitle="Destaques extraídos das gravações"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar clipe..."
      />

      <div className="px-5 py-6 md:px-8 md:py-8">
        {loading && clips.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <RefreshCw size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(clip => (
              <article key={clip.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-brand/40">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/15 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-brand">
                    <Scissors size={16} />
                  </div>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatDuration(clip.duration)}
                  </span>
                </div>
                <h3 className="mt-4 truncate font-mono text-sm text-foreground" title={clip.filename}>{clip.filename}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(clip.date)} · {formatBytes(clip.size)}</p>
                {clip.sourceRecording && (
                  <p className="mt-3 truncate text-[11px] text-muted-foreground">
                    de <span className="text-foreground/80">{clip.sourceRecording}</span>
                  </p>
                )}
                <div className="mt-4">
                  <AudioPlayer
                    filename={clip.filename}
                    src={`${import.meta.env.VITE_BOT_API_BASE ?? ''}/api/clips/file/${encodeURIComponent(clip.filename)}`}
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
            Nenhum clipe encontrado.
          </div>
        )}
      </div>
    </>
  );
}
