import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.includes('Invalid login')
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível fazer login. Tente novamente.'
          : 'Erro inesperado. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mb-4 shadow-lg shadow-primary-600/25">
            <img src="/logo.jpg" alt="Retiro 2027" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Retiro 2027</h1>
          <p className="text-sm text-text-secondary mt-1">Gestão de Participantes</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-5">Entrar no sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="bg-danger-light border border-danger/20 rounded-lg px-4 py-3" role="alert">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-tertiary mt-6">
          Acesso restrito a coordenadores autorizados.
        </p>
      </div>
    </div>
  );
}
