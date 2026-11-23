/** Normaliza CPF removendo pontuação e caracteres não numéricos */
export function normalizeCpf(value?: string | null): string {
  return String(value ?? '').replace(/\D+/g, '');
}

/** Valida os 11 dígitos e dígitos verificadores de um CPF brasileiro */
export function isValidCpf(value?: string | null): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(cpf[10]);
}

/**
 * Gera hash criptográfico SHA-256 local com prefixo de domínio (usado apenas como
 * fallback em testes/demo quando a Edge Function `cpf-hash` não estiver configurada).
 * Nunca expõe o CPF original.
 */
export async function hashCpfFallback(cpfDigits: string, scope = 'retiro-2027-demo'): Promise<string | null> {
  const normalized = normalizeCpf(cpfDigits);
  if (normalized.length !== 11) return null;

  const data = new TextEncoder().encode(`${scope}:${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
