import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toAuthEmail } from '../utils/username';

export function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-secondary">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" aria-label="Carregando sessão" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Informe seu usuário ou e-mail e sua senha para entrar.');
      return;
    }

    setLoading(true);
    try {
      await signIn(toAuthEmail(identifier), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('Invalid login')
          ? 'Usuário, e-mail ou senha incorretos. Confira seus dados e tente novamente.'
          : 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-surface-secondary flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary-900 border border-primary-800/20 shadow-sm mb-4">
            <img
              src="/logo-128.webp"
              alt="Logotipo Retiro de Jovens 2027"
              width={56}
              height={56}
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Retiro de Jovens 2027
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            ADTC Templo Central de Ubajara
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h2 className="text-base font-semibold text-text-primary mb-5">
            Acesso da coordenação
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Usuário ou e-mail"
              name="username"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="ex.: claudejan ou nome@exemplo.com"
              helperText="Aceita nome de usuário (ex.: claudejan) ou e-mail cadastrado."
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-text-secondary">
                  Senha<span className="text-danger ml-0.5">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  className="inline-flex items-center gap-1 min-h-[36px] px-2 -my-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer rounded"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Mostrar</span>
                    </>
                  )}
                </button>
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha…"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-lg border border-border hover:border-border-strong text-sm bg-white text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {error && (
              <div
                className="bg-danger-light border border-danger/20 rounded-lg px-3.5 py-2.5"
                role="alert"
              >
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {loading ? 'Entrando…' : 'Entrar no painel'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-tertiary">
          Uso restrito a líderes, secretaria e coordenação autorizada.
        </p>
      </div>
    </main>
  );
}
