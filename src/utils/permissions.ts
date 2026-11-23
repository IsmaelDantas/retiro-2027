import type { UserRole } from '../types/database';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador(a)',
  coordinator: 'Coordenador(a)',
  viewer: 'Supervisor(a)',
};

/** Verifica se o perfil possui permissão de criação, edição e importação de inscritos */
export function canManageData(role?: string | null): boolean {
  return role === 'admin' || role === 'coordinator';
}

/** Verifica se o perfil pode acessar a gestão de contas da equipe */
export function canManageUsers(role?: string | null): boolean {
  return role === 'admin' || role === 'coordinator';
}

export function isAdmin(role?: string | null): boolean {
  return role === 'admin';
}

export function isViewer(role?: string | null): boolean {
  return role === 'viewer';
}

export function getRoleLabel(role?: string | null): string {
  if (!role) return ROLE_LABELS.viewer;
  return ROLE_LABELS[role as UserRole] ?? role;
}

/** Níveis que o usuário atual pode atribuir ao criar uma nova conta */
export function getAssignableRoles(actorRole?: string | null): UserRole[] {
  if (actorRole === 'admin') return ['admin', 'coordinator', 'viewer'];
  if (actorRole === 'coordinator') return ['coordinator', 'viewer'];
  return [];
}

/** Verifica se o ator pode editar nome/senha de outro usuário na tela de equipe */
export function canEditTargetUser(
  actorRole?: string | null,
  targetRole?: string | null,
  isSelf = false
): boolean {
  if (isSelf) return false;
  if (actorRole === 'admin') return true;
  if (actorRole === 'coordinator') {
    return targetRole === 'coordinator' || targetRole === 'viewer';
  }
  return false;
}

/** Verifica se o ator pode alterar o nível de um usuário alvo para nextRole */
export function canChangeTargetRole(
  actorRole?: string | null,
  targetRole?: string | null,
  nextRole?: string | null,
  isSelf = false
): boolean {
  if (isSelf || !nextRole) return false;
  if (actorRole === 'admin') {
    return nextRole === 'admin' || nextRole === 'coordinator' || nextRole === 'viewer';
  }
  if (actorRole === 'coordinator') {
    if (targetRole === 'admin' || nextRole === 'admin') return false;
    // Apenas administradores podem rebaixar outro coordenador
    if (targetRole === 'coordinator' && nextRole !== 'coordinator') return false;
    return nextRole === 'coordinator' || nextRole === 'viewer';
  }
  return false;
}

/** Apenas administradores podem excluir outros coordenadores ou administradores */
export function canDeleteTargetUser(
  actorRole?: string | null,
  targetRole?: string | null,
  isSelf = false
): boolean {
  if (isSelf) return false;
  if (actorRole === 'admin') return true;
  if (actorRole === 'coordinator') return targetRole === 'viewer';
  return false;
}
