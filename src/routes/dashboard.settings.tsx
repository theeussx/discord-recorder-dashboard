import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Bell, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { TopBar } from '@/components/top-bar';
import { signOut } from '@/lib/auth';

export const Route = createFileRoute('/dashboard/settings')({
  head: () => ({ meta: [{ title: 'Configurações — Wardizitto' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate  = useNavigate();
  const [autoRecord, setAutoRecord] = useState(true);
  const [notify, setNotify]         = useState(true);
  const [quality, setQuality]       = useState<'standard' | 'high' | 'lossless'>('high');

  async function handleLogout() {
    await signOut();
    navigate({ to: '/login', replace: true });
  }

  return (
    <>
      <TopBar title="Configurações" subtitle="Preferências da conta e do bot" />

      <div className="grid gap-6 px-5 py-6 md:grid-cols-2 md:px-8 md:py-8">
        {/* Segurança */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-brand">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Sessão</h2>
              <p className="text-xs text-muted-foreground">Conta de administrador</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex h-10 w-full items-center rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
              admin
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar a senha, edite <code className="rounded bg-accent px-1 py-0.5 font-mono">ADMIN_PASS_HASH</code> no <code className="rounded bg-accent px-1 py-0.5 font-mono">.env</code> do servidor com um novo hash bcrypt.
            </p>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
            >
              <LogOut size={14} /> Encerrar sessão
            </button>
          </div>
        </section>

        {/* Bot & gravação */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-brand">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Bot & gravação</h2>
              <p className="text-xs text-muted-foreground">Comportamento padrão do recorder</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <Toggle
              label="Gravar canais automaticamente"
              description="Inicia ao detectar entrada de usuários"
              checked={autoRecord}
              onChange={setAutoRecord}
            />
            <Toggle
              label="Notificar ao finalizar sessão"
              description="Envia mensagem no canal de log"
              checked={notify}
              onChange={setNotify}
            />
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Qualidade de áudio</div>
              <div className="grid grid-cols-3 gap-2">
                {(['standard', 'high', 'lossless'] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      quality === q
                        ? 'border-brand/60 bg-brand/10 text-brand'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {q === 'standard' ? 'Padrão' : q === 'high' ? 'Alta' : 'Sem perdas'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/30 px-4 py-3">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
