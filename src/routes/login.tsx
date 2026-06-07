import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight, Lock, Mic, ShieldCheck, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { hasSessionSync, signIn } from '@/lib/auth';
import { BrandLockup } from '@/components/brand';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Entrar — Wardizitto Recordings' },
      { name: 'description', content: 'Acesse o painel das gravações do Discord.' },
    ],
  }),
  beforeLoad: () => {
    if (hasSessionSync()) throw redirect({ to: '/dashboard' });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError('Digite a senha'); return; }
    setError('');
    setLoading(true);
    try {
      await signIn(password);
      toast.success('Bem-vindo!');
      navigate({ to: '/dashboard', replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senha incorreta');
      toast.error('Acesso negado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Painel esquerdo — visual */}
      <div className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--brand)_25%,transparent),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--background),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandLockup />
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Painel privado
              </span>
              <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">
                Suas gravações do Discord,
                <br />
                <span className="bg-gradient-to-r from-brand to-foreground bg-clip-text text-transparent">
                  organizadas com calma.
                </span>
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Acompanhe sessões ao vivo, ouça clipes destacados e gerencie o
                armazenamento — tudo em um lugar minimalista e rápido.
              </p>
            </div>
            <div className="grid gap-3 text-sm">
              <Feature icon={Mic} text="Gravação multicanal com participantes identificados" />
              <Feature icon={Scissors} text="Sistema de clips por intervalo de tempo" />
              <Feature icon={ShieldCheck} text="Acesso protegido por senha com hash bcrypt" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Wardizitto Recordings</p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="relative flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandLockup />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entrar no painel</h1>
            <p className="mt-1 text-sm text-muted-foreground">Digite a senha de administrador para acessar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Senha</span>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                  className={`h-11 w-full rounded-lg border bg-input/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 ${
                    error
                      ? 'border-destructive/60 focus:border-destructive focus:ring-destructive/30'
                      : 'border-border focus:border-brand/60 focus:ring-brand/30'
                  }`}
                />
              </div>
              {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Verificando...' : 'Entrar'}
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              Acesso restrito ao administrador do sistema.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Mic; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-brand">
        <Icon size={15} />
      </div>
      <p className="pt-1.5 text-muted-foreground">{text}</p>
    </div>
  );
}
