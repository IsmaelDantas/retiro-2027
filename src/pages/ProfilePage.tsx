import { LogOut, User as UserIcon, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/date';

export function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Coordenador';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      showToast('Não foi possível sair. Tente novamente.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Perfil</h1>

      {/* User Info */}
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xl font-bold text-primary-700">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{displayName}</h2>
            <p className="text-sm text-text-secondary">{profile?.role === 'coordinator' ? 'Coordenador(a)' : profile?.role || 'Coordenador(a)'}</p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          {user?.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-primary">{user.email}</span>
            </div>
          )}
          {profile?.created_at && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">
                Membro desde {formatDate(profile.created_at)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <UserIcon className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm text-text-secondary">
              ID: {user?.id?.slice(0, 8)}...
            </span>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Button
        variant="secondary"
        onClick={handleLogout}
        className="w-full"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </Button>

      {/* App info */}
      <div className="text-center space-y-1">
        <p className="text-xs text-text-tertiary">Retiro 2027 — v1.0.0</p>
        <p className="text-xs text-text-tertiary">
          Sistema de Gestão de Participantes
        </p>
      </div>
    </div>
  );
}
