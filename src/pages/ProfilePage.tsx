import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  User as UserIcon,
  Mail,
  Calendar,
  ShieldCheck,
  History,
  KeyRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { updateOwnPassword } from '../services/auth';
import { formatDate, formatDateTime } from '../utils/date';
import { canManageData, canManageUsers, getRoleLabel } from '../utils/permissions';
import { formatUserHandle, USERNAME_EMAIL_DOMAIN } from '../utils/username';
import { fetchAuditLogs } from '../services/audit';
import type { AuditLog } from '../types/database';

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  IMPORT: 'Importação',
};

export function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const writable = canManageData(profile?.role);
  const canUsers = canManageUsers(profile?.role);
  const userHandle = profile
    ? formatUserHandle(profile)
    : user?.email
      ? formatUserHandle({ email: user.email })
      : '';
  const hasRealEmail = Boolean(
    user?.email && !user.email.endsWith(`@${USERNAME_EMAIL_DOMAIN}`)
  );

  useEffect(() => {
    let active = true;
    fetchAuditLogs(20)
      .then((logs) => {
        if (active) setAuditLogs(logs);
      })
      .catch(() => {
        if (active) setAuditError(true);
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      showToast('Não foi possível sair. Tente novamente.', 'error');
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('A nova senha precisa ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('As senhas digitadas não coincidem.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await updateOwnPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Sua senha foi alterada com sucesso.');
    } catch {
      showToast('Não foi possível atualizar a senha agora.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Perfil e Auditoria
        </h1>
        <p className="text-sm text-slate-500">
          Sua conta de acesso, nível de permissão e histórico recente de alterações.
        </p>
      </div>

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
            <p className="text-sm text-text-secondary flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-600" />
              {getRoleLabel(profile?.role)}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600">
          {writable
            ? 'Seu perfil possui permissão para cadastrar, editar e importar registros. Todas as ações ficam registradas no log de auditoria.'
            : 'Seu perfil está em modo somente leitura: você pode visualizar listas, relatórios e logs, sem alterar ou excluir dados.'}
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          {userHandle && (
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-mono text-text-primary">Usuário: {userHandle}</span>
            </div>
          )}
          {hasRealEmail && user?.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">{user.email}</span>
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
        </div>

        {canUsers && (
          <div className="pt-2">
            <Link to="/users">
              <Button variant="secondary" size="sm">
                <Users className="w-4 h-4" />
                Gerenciar Equipe e Contas
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Change Password */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-semibold text-text-primary">Alterar minha senha</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
          />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" size="sm" loading={savingPassword}>
              Salvar nova senha
            </Button>
          </div>
        </form>
      </Card>

      {/* Audit Log (LGPD) */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-semibold text-text-primary">Log de Auditoria Recente</h2>
        </div>
        <p className="text-xs text-text-secondary">
          Registro de rastreabilidade (quem alterou o quê e quando) sem expor dados pessoais sensíveis.
        </p>

        {auditLoading ? (
          <p className="text-xs text-text-tertiary">Carregando histórico...</p>
        ) : auditError ? (
          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            A tabela <code className="font-mono">audit_logs</code> ainda não foi aplicada no banco Supabase.
          </p>
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-text-tertiary">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">
                    {ACTION_LABELS[log.action] ?? log.action} em <span className="font-mono">{log.table_name}</span>
                  </p>
                  <p className="text-text-tertiary truncate">
                    Perfil: {getRoleLabel(log.actor_role)}
                    {log.record_id ? ` • ID ${log.record_id.slice(0, 8)}...` : ''}
                  </p>
                </div>
                <span className="text-text-tertiary whitespace-nowrap tabular-nums">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
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
        <p className="text-xs text-text-tertiary">Retiro 2027 — Atividade Extensionista IV</p>
        <p className="text-xs text-text-tertiary">
          Sistema de Gestão de Participantes (ADTC Ubajara/CE)
        </p>
      </div>
    </div>
  );
}
