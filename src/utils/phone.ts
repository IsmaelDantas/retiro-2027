/** Remove caracteres não numéricos de um telefone/WhatsApp */
export function normalizePhoneDigits(phone?: string | null): string {
  return String(phone ?? '').replace(/\D+/g, '');
}

/** Formata telefone brasileiro para exibição legível */
export function formatPhone(phone?: string | null): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '—';
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone ?? '—';
}

/** Gera URL wa.me/55... segura ou null se telefone inválido */
export function buildWhatsAppUrl(phone?: string | null, message?: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10) return null;

  const fullNumber = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${fullNumber}${query}`;
}
