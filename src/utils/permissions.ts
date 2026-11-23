import type { UserRole } from '../types/database';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador(a)',
  coordinator: 'Coordenador(a)',
  viewer: 'Somente leitura (Consulta)',
};

/** Verifica se o perfil possui permissão de criação, edição e importação */
export function canManageData(role?: string | null): boolean {
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
