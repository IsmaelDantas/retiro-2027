import { isMinorAtRetreat } from './date';
import type { ParticipantWithGuardian } from '../types/database';

export interface CongregationCount {
  congregation: string;
  count: number;
}

export interface DailyEvolutionPoint {
  date: string;
  label: string;
  count: number;
}

export interface CoordinatorMetrics {
  total: number;
  active: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  residents: number;
  nonResidents: number;
  residenceUnknown: number;
  minors: number;
  adults: number;
  ageUnknown: number;
  minorsWithoutGuardian: ParticipantWithGuardian[];
  shirtsPurchased: number;
  shirtsNotPurchased: number;
  byCongregation: CongregationCount[];
  dailyEvolution: DailyEvolutionPoint[];
}

/** Verifica se um participante menor de idade (em 06/02/2027) está sem responsável completo */
export function isMinorMissingGuardian(participant: ParticipantWithGuardian): boolean {
  if (participant.status === 'cancelled') return false;
  if (!isMinorAtRetreat(participant.birth_date)) return false;
  return !participant.guardian || !participant.guardian.full_name.trim() || !participant.guardian.phone.trim();
}

/** Calcula todos os indicadores gerenciais do painel mobile-first do coordenador */
export function computeCoordinatorMetrics(participants: ParticipantWithGuardian[]): CoordinatorMetrics {
  const activeList = participants.filter((p) => p.status !== 'cancelled');
  const confirmed = participants.filter((p) => p.status === 'confirmed').length;
  const pending = participants.filter((p) => p.status === 'pending').length;
  const cancelled = participants.filter((p) => p.status === 'cancelled').length;

  let residents = 0;
  let nonResidents = 0;
  let residenceUnknown = 0;

  let minors = 0;
  let adults = 0;
  let ageUnknown = 0;

  let shirtsPurchased = 0;
  let shirtsNotPurchased = 0;

  const minorsWithoutGuardian: ParticipantWithGuardian[] = [];
  const congregationMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();

  for (const p of activeList) {
    if (p.is_resident === true) residents++;
    else if (p.is_resident === false) nonResidents++;
    else residenceUnknown++;

    if (!p.birth_date) {
      ageUnknown++;
    } else if (isMinorAtRetreat(p.birth_date)) {
      minors++;
      if (isMinorMissingGuardian(p)) {
        minorsWithoutGuardian.push(p);
      }
    } else {
      adults++;
    }

    if (p.shirt_purchased) shirtsPurchased++;
    else shirtsNotPurchased++;

    const cong = (p.congregation ?? '').trim() || 'Não informada';
    congregationMap.set(cong, (congregationMap.get(cong) ?? 0) + 1);

    const refDate = (p.registered_at ?? p.created_at ?? '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(refDate)) {
      dailyMap.set(refDate, (dailyMap.get(refDate) ?? 0) + 1);
    }
  }

  const byCongregation: CongregationCount[] = Array.from(congregationMap.entries())
    .map(([congregation, count]) => ({ congregation, count }))
    .sort((a, b) => b.count - a.count || a.congregation.localeCompare(b.congregation, 'pt-BR'));

  const dailyEvolution: DailyEvolutionPoint[] = Array.from(dailyMap.entries())
    .sort(([d1], [d2]) => d1.localeCompare(d2))
    .slice(-10)
    .map(([date, count]) => ({
      date,
      label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      count,
    }));

  return {
    total: participants.length,
    active: activeList.length,
    confirmed,
    pending,
    cancelled,
    residents,
    nonResidents,
    residenceUnknown,
    minors,
    adults,
    ageUnknown,
    minorsWithoutGuardian,
    shirtsPurchased,
    shirtsNotPurchased,
    byCongregation,
    dailyEvolution,
  };
}
