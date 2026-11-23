export const USERNAME_EMAIL_DOMAIN = 'retiro2027.app';

/** Normaliza nome ou identificador digitado para username válido (a-z, 0-9, ., _, -) */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username);
}

/**
 * Converte identificador de login (usuário simples ou e-mail legado)
 * no formato aceito pelo Supabase Auth.
 */
export function toAuthEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const normalized = normalizeUsername(trimmed);
  return `${normalized}@${USERNAME_EMAIL_DOMAIN}`;
}

export function formatUserHandle(user: { username?: string | null; email: string }): string {
  if (user.username) return `@${user.username}`;
  const suffix = `@${USERNAME_EMAIL_DOMAIN}`;
  if (user.email.endsWith(suffix)) {
    return `@${user.email.slice(0, -suffix.length)}`;
  }
  return user.email;
}

/** Gera senha legível de 10 caracteres sem caracteres confusos (O/0, I/l) */
export function generateReadablePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
