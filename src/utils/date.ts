/** Data oficial de início do Retiro 2027 (referência de maioridade usada no PHP da igreja) */
export const RETREAT_START_DATE = '2027-02-06';

function parseDateParts(dateString: string | null): { year: number; month: number; day: number } | null {
  if (!dateString) return null;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString.trim());
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(dateString.trim());
  if (brMatch) {
    return {
      year: Number(brMatch[3]),
      month: Number(brMatch[2]),
      day: Number(brMatch[1]),
    };
  }
  return null;
}

/** Calcula idade em uma data de referência (por padrão, hoje) */
export function calculateAge(birthDate: string | null, referenceDate?: string): number | null {
  const birth = parseDateParts(birthDate);
  if (!birth) return null;

  const ref = referenceDate
    ? parseDateParts(referenceDate)
    : (() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
      })();

  if (!ref) return null;

  let age = ref.year - birth.year;
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) {
    age--;
  }

  return age >= 0 ? age : null;
}

/** Calcula idade exatamente na data de início do retiro (2027-02-06) */
export function calculateAgeAtRetreat(birthDate: string | null): number | null {
  return calculateAge(birthDate, RETREAT_START_DATE);
}

/** Verifica se o participante terá menos de 18 anos no início do retiro (2027-02-06) */
export function isMinorAtRetreat(birthDate: string | null): boolean {
  const age = calculateAgeAtRetreat(birthDate);
  return age !== null && age < 18;
}

/** Formata data ISO ou BR para DD/MM/AAAA */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';

  const parts = parseDateParts(dateString);
  if (parts) {
    return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formata data e hora para DD/MM/AAAA HH:MM */
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
