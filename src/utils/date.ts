/** Calculate age from a birth date string (YYYY-MM-DD) */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  if (isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/** Format a date string to DD/MM/YYYY */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Format a datetime string to DD/MM/YYYY HH:MM */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
