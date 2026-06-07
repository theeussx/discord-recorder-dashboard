import { Radio, RefreshCw, Search } from "lucide-react";
import { formatTime } from "@/lib/format";

interface Props {
  title: string;
  subtitle?: string;
  isLive?: boolean;
  lastRefresh?: Date;
  onRefresh?: () => void;
  loading?: boolean;
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
}

export function TopBar({
  title,
  subtitle,
  isLive,
  lastRefresh,
  onRefresh,
  loading,
  search,
  onSearch,
  searchPlaceholder = "Buscar...",
}: Props) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/80 px-5 py-4 backdrop-blur-xl md:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {title}
          </h1>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-live">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
              </span>
              Ao vivo
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="ml-auto flex flex-1 items-center justify-end gap-2 md:flex-none">
        {onSearch && (
          <div className="relative w-full md:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-border bg-input/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:border-brand/40 hover:text-foreground"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">
              {lastRefresh ? `Atualizado ${formatTime(lastRefresh)}` : "Atualizar"}
            </span>
          </button>
        )}

        {isLive !== undefined && !isLive && (
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex">
            <Radio size={11} /> Em espera
          </span>
        )}
      </div>
    </header>
  );
}
