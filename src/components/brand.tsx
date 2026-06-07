import { Mic } from "lucide-react";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const icon = size === "sm" ? 16 : size === "lg" ? 22 : 18;
  return (
    <div className={`${dim} relative grid place-items-center rounded-xl bg-gradient-to-br from-brand to-brand/40 shadow-lg shadow-brand/20`}>
      <Mic size={icon} className="text-brand-foreground" />
      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}

export function BrandLockup({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-foreground">Wardizitto</div>
        {subtitle && (
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Recordings
          </div>
        )}
      </div>
    </div>
  );
}
