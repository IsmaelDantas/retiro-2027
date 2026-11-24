import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Copy,
  Edit,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ErrorState } from '../components/ui/ErrorState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  createTeamUser,
  deleteTeamUser,
  fetchTeamUsers,
  updateTeamUser,
} from '../services/users';
import {
  canChangeTargetRole,
  canDeleteTargetUser,
  canEditTargetUser,
  canManageUsers,
  getAssignableRoles,
  getRoleLabel,
} from '../utils/permissions';
import {
  formatUserHandle,
  generateReadablePassword,
  isValidUsername,
  normalizeUsername,
} from '../utils/username';
import { formatDate } from '../utils/date';
import type { UserProfile, UserRole } from '../types/database';

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  admin: 'bg-primary-50 text-primary-700 border-primary-200',
  coordinator: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
};

interface CreatedCredentials {
  name: string;
  username: string;
  password: string;
  roleLabel: string;
}

export function UsersPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const actorRole = profile?.role;
  const allowed = canManageUsers(actorRole);
  const assignableRoles = getAssignableRoles(actorRole);

  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de criação
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [newRole, setNewRole] = useState<UserRole>('coordinator');
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<CreatedCredentials | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Modal de edição
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('coordinator');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal de exclusão
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTeamUsers();
      setTeam(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as contas.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const openCreateModal = () => {
    setNewName('');
    setNewUsername('');
    setUsernameTouched(false);
    setNewPassword(generateReadablePassword());
    setShowNewPassword(true);
    setNewRole(assignableRoles.includes('coordinator') ? 'coordinator' : 'viewer');
    setCreateOpen(true);
  };

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (!usernameTouched) {
      setNewUsername(normalizeUsername(value));
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanUsername = normalizeUsername(newUsername);

    if (cleanName.length < 2) {
      showToast('Informe o nome completo.', 'error');
      return;
    }
    if (!isValidUsername(cleanUsername)) {
      showToast('Usuário inválido. Use 3 a 32 letras/números (ex.: maria.silva).', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('A senha inicial precisa ter ao menos 6 caracteres.', 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createTeamUser({
        name: cleanName,
        username: cleanUsername,
        password: newPassword,
        role: newRole,
      });
      setTeam((prev) => [...prev, created]);
      setCreateOpen(false);
      setCopiedCreds(false);
      setCreatedInfo({
        name: created.name,
        username: cleanUsername,
        password: newPassword,
        roleLabel: getRoleLabel(created.role),
      });
      showToast(`Conta "${cleanUsername}" criada com sucesso.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar conta.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdInfo) return;
    const text = [
      `Acesso ao Painel Retiro 2027`,
      `Link: ${window.location.origin}/login`,
      `Nome: ${createdInfo.name} (${createdInfo.roleLabel})`,
      `Usuário: ${createdInfo.username}`,
      `Senha: ${createdInfo.password}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedCreds(true);
      showToast('Dados de acesso copiados!');
    } catch {
      showToast('Copie os dados manualmente na caixa acima.', 'info');
    }
  };

  const openEditModal = (target: UserProfile) => {
    setEditingUser(target);
    setEditName(target.name);
    setEditRole((target.role as UserRole) || 'viewer');
    setEditPassword('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanName = editName.trim();
    if (cleanName.length < 2) {
      showToast('O nome precisa ter ao menos 2 caracteres.', 'error');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    const canChangeRole = canChangeTargetRole(
      actorRole,
      editingUser.role,
      editRole,
      editingUser.id === user?.id
    );

    setSavingEdit(true);
    try {
      const updated = await updateTeamUser({
        userId: editingUser.id,
        name: cleanName,
        role: canChangeRole ? editRole : undefined,
        password: editPassword.trim() ? editPassword : undefined,
      });
      setTeam((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      showToast('Conta atualizada com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar conta.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await deleteTeamUser(deletingUser.id);
      setTeam((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
      showToast('Acesso removido com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir a conta.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!allowed) {
    return (
      <Card className="p-6 text-center space-y-3">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Acesso restrito</h1>
        <p className="text-sm text-slate-600">
          Contas de Supervisor possuem acesso somente leitura e não podem criar ou gerenciar usuários.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Equipe e Contas
          </h1>
          <p className="text-sm text-slate-500">
            Crie acessos com usuário e senha para coordenadores e supervisores do retiro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadTeam()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <UserPlus className="w-4 h-4" />
            Nova conta
          </Button>
        </div>
      </div>

      {/* Created credentials banner */}
      {createdInfo && (
        <Card className="bg-emerald-50 border-emerald-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-emerald-900">
                Conta criada para {createdInfo.name}
              </h2>
              <p className="text-xs text-emerald-800">
                Envie os dados abaixo para o integrante fazer o primeiro login ({createdInfo.roleLabel}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => void copyCredentials()}>
                {copiedCreds ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedCreds ? 'Copiado' : 'Copiar acesso'}
              </Button>
              <button
                type="button"
                onClick={() => setCreatedInfo(null)}
                className="min-h-[36px] px-2.5 text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/90 border border-emerald-200 rounded-lg p-3 font-mono">
            <div>
              <span className="text-slate-500">Usuário: </span>
              <strong className="text-slate-900 select-all">{createdInfo.username}</strong>
            </div>
            <div>
              <span className="text-slate-500">Senha inicial: </span>
              <strong className="text-slate-900 select-all">{createdInfo.password}</strong>
            </div>
          </div>
        </Card>
      )}

      {/* Role Hierarchy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 space-y-1">
          <p className="text-xs font-bold text-primary-700 uppercase tracking-wide">
            Administrador
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Liderança principal. Controle total de dados e único nível que pode excluir ou alterar outros Coordenadores.
          </p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            Coordenador
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Gerencia inscritos, camisas e importações CSV. Pode criar novos Coordenadores e Supervisores.
          </p>
        </Card>
        <Card className="p-4 space-y-1">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Supervisor
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Somente leitura: acompanha painel, lista de inscritos, camisas e relatórios, sem alterar ou adicionar dados.
          </p>
        </Card>
      </div>

      {/* Team List */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadTeam()} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {team.map((member) => {
              const isSelf = member.id === user?.id;
              const roleKey = (member.role as UserRole) || 'viewer';
              const badgeStyle = ROLE_BADGE_STYLES[roleKey] ?? ROLE_BADGE_STYLES.viewer;
              const editable = canEditTargetUser(actorRole, member.role, isSelf);
              const deletable = canDeleteTargetUser(actorRole, member.role, isSelf);

              return (
                <Card key={member.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {member.name}{' '}
                        {isSelf && <span className="text-xs font-medium text-primary-600">(você)</span>}
                      </p>
                      <p className="text-xs font-mono text-slate-500 truncate mt-0.5">
                        {formatUserHandle(member)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${badgeStyle}`}
                    >
                      {getRoleLabel(member.role)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-slate-500">
                    <span className="tabular-nums">Criado em {formatDate(member.created_at)}</span>
                    {(editable || deletable) && (
                      <div className="flex items-center gap-1.5">
                        {editable && (
                          <Button size="sm" variant="secondary" onClick={() => openEditModal(member)}>
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                        )}
                        {deletable && (
                          <Button
                            size="sm"
                            variant="danger"
                            aria-label={`Excluir ${member.name}`}
                            onClick={() => setDeletingUser(member)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-border overflow-hidden">
            <div
              role="region"
              aria-label="Contas da equipe"
              tabIndex={0}
              className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-600 uppercase">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Usuário de acesso</th>
                    <th className="px-4 py-3">Nível</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {team.map((member) => {
                    const isSelf = member.id === user?.id;
                    const roleKey = (member.role as UserRole) || 'viewer';
                    const badgeStyle = ROLE_BADGE_STYLES[roleKey] ?? ROLE_BADGE_STYLES.viewer;
                    const editable = canEditTargetUser(actorRole, member.role, isSelf);
                    const deletable = canDeleteTargetUser(actorRole, member.role, isSelf);

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {member.name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-medium text-primary-600">(você)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {formatUserHandle(member)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            {getRoleLabel(member.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                          {formatDate(member.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editable || deletable ? (
                            <div className="inline-flex items-center gap-2">
                              {editable && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openEditModal(member)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Editar / Senha
                                </Button>
                              )}
                              {deletable && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  aria-label={`Excluir ${member.name}`}
                                  onClick={() => setDeletingUser(member)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {isSelf ? 'Gerencie em Perfil' : 'Protegido'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              Total: <strong className="tabular-nums">{team.length}</strong> conta(s) cadastrada(s).
            </span>
          </p>
        </>
      )}

      {/* Modal: Create Account */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Criar nova conta">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Nome completo"
            value={newName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="ex.: Maria Silva"
            required
          />

          <div>
            <Input
              label="Nome de usuário (para entrar no app)"
              value={newUsername}
              onChange={(e) => {
                setUsernameTouched(true);
                setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'));
              }}
              placeholder="ex.: maria.silva"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Apenas letras minúsculas, números e pontos/hífens (sem espaços).
            </p>
          </div>

          <Select
            label="Nível de acesso"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            options={assignableRoles.map((r) => ({
              value: r,
              label: getRoleLabel(r),
            }))}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="create-password" className="text-sm font-medium text-text-secondary">
                Senha inicial<span className="text-danger ml-0.5">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewPassword(generateReadablePassword())}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer px-1.5 py-1"
                >
                  Gerar senha
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer px-1.5 py-1"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <input
              id="create-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-lg border border-border bg-white text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={creating}>
              Criar conta
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit / Reset Password */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={`Editar ${editingUser?.name ?? 'conta'}`}
      >
        {editingUser && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-border text-xs font-mono text-slate-600">
              Usuário: <strong>{formatUserHandle(editingUser)}</strong>
            </div>

            <Input
              label="Nome"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            {canChangeTargetRole(
              actorRole,
              editingUser.role,
              editingUser.role === 'viewer' ? 'coordinator' : 'viewer',
              editingUser.id === user?.id
            ) ? (
              <Select
                label="Nível de acesso"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                options={assignableRoles.map((r) => ({
                  value: r,
                  label: getRoleLabel(r),
                }))}
              />
            ) : (
              <div className="rounded-lg bg-slate-50 border border-border px-3 py-2.5 text-xs text-slate-600">
                Nível atual: <strong>{getRoleLabel(editingUser.role)}</strong>. Somente
                administradores podem alterar ou rebaixar outro Coordenador.
              </div>
            )}

            <div>
              <Input
                label="Nova senha (opcional — preencha apenas para redefinir)"
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Deixe vazio para manter a senha atual"
              />
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <KeyRound className="w-3 h-3" aria-hidden="true" />
                <span>Mínimo 6 caracteres se quiser redefinir.</span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" loading={savingEdit}>
                Salvar alterações
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        title="Excluir conta"
      >
        {deletingUser && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja remover o acesso de <strong>{deletingUser.name}</strong> (
              <span className="font-mono">{formatUserHandle(deletingUser)}</span>)? Essa conta não
              poderá mais entrar no aplicativo.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeletingUser(null)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteConfirm}>
                Excluir acesso
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
