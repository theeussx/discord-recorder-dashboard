import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: "brand" | "success" | "warning" | "destructive";
}

const accentMap = {
  brand: "from-brand/20 to-brand/0 text-brand",
  success: "from-success/20 to-success/0 text-success",
  warning: "from-warning/25 to-warning/0 text-warning",
  destructive: "from-destructive/25 to-destructive/0 text-destructive",
};

export function StatCard({ label, value, hint, icon: Icon, accent = "brand" }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-brand/40">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${accentMap[accent]} opacity-70 blur-2xl transition-opacity group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-accent ${accentMap[accent].split(" ").pop()}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
