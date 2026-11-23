import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInvoke, mockFrom } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}));

import { buildImportPreview } from '../src/services/import';
import { computeCoordinatorMetrics } from '../src/utils/dashboardMetrics';
import { hashCpfFallback } from '../src/utils/cpf';
import type { NormalizedImportRow } from '../src/utils/importParser';
import type { ParticipantWithGuardian } from '../src/types/database';

function makeRow(overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow {
  return {
    rowIndex: 2,
    protocol: 'RET-2027-010',
    full_name: 'Jovem Teste',
    cpf_digits: '52998224725',
    cpf_valid: true,
    locality: 'Centro',
    email: 'jovem@exemplo.com',
    is_resident: true,
    status: 'confirmed',
    birth_date: '2008-05-10',
    phone: '88999990001',
    congregation: 'Templo Central',
    guardian_full_name: '',
    guardian_phone: '',
    registered_at: '2026-11-10T10:00:00',
    is_minor: false,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

describe('buildImportPreview — idempotência e anti-duplicidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockRejectedValue(new Error('offline demo'));
  });

  it('classifica novo -> sem mudança -> atualização sem duplicar participante existente', async () => {
    const existingHash = await hashCpfFallback('52998224725');

    // 1ª simulação: banco vazio -> create
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const firstPreview = await buildImportPreview([makeRow()]);
    expect(firstPreview.counts.create).toBe(1);
    expect(firstPreview.counts.update).toBe(0);
    expect(firstPreview.items[0].action).toBe('create');

    // 2ª simulação: mesmo registro já salvo -> unchanged
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'uuid-1',
            protocol: 'RET-2027-010',
            cpf_hash: existingHash,
            full_name: 'Jovem Teste',
            birth_date: '2008-05-10',
            phone: '88999990001',
            email: 'jovem@exemplo.com',
            congregation: 'Templo Central',
            locality: 'Centro',
            is_resident: true,
            status: 'confirmed',
          },
        ],
        error: null,
      }),
    });
    const secondPreview = await buildImportPreview([makeRow()]);
    expect(secondPreview.counts.unchanged).toBe(1);
    expect(secondPreview.counts.create).toBe(0);

    // 3ª simulação: situação mudou no site da igreja para cancelada e casou por cpf_hash sem protocolo -> update
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'uuid-1',
            protocol: null,
            cpf_hash: existingHash,
            full_name: 'Jovem Teste',
            birth_date: '2008-05-10',
            phone: '88999990001',
            email: 'jovem@exemplo.com',
            congregation: 'Templo Central',
            locality: 'Centro',
            is_resident: true,
            status: 'confirmed',
          },
        ],
        error: null,
      }),
    });
    const thirdPreview = await buildImportPreview([makeRow({ protocol: null, status: 'cancelled' })]);
    expect(thirdPreview.counts.update).toBe(1);
    expect(thirdPreview.items[0].existingParticipantId).toBe('uuid-1');
  });
});

describe('computeCoordinatorMetrics — totalizadores do painel', () => {
  it('calcula internos, menores, camisas Sim/Não, congregações e menores sem responsável', () => {
    const sample: ParticipantWithGuardian[] = [
      {
        id: '1',
        protocol: 'P1',
        cpf_hash: null,
        full_name: 'Adulto Interno',
        birth_date: '2005-01-01',
        phone: '88999990001',
        email: null,
        congregation: 'Templo Central',
        locality: 'Centro',
        is_resident: true,
        registered_at: '2026-11-10T10:00:00Z',
        shirt_purchased: true,
        shirt_size: 'M',
        notes: null,
        status: 'confirmed',
        created_at: '2026-11-10T10:00:00Z',
        updated_at: '2026-11-10T10:00:00Z',
        guardian: null,
      },
      {
        id: '2',
        protocol: 'P2',
        cpf_hash: null,
        full_name: 'Menor Sem Resp',
        birth_date: '2011-05-01',
        phone: '88999990002',
        email: null,
        congregation: 'Congregação Sul',
        locality: 'Bairro',
        is_resident: false,
        registered_at: '2026-11-11T10:00:00Z',
        shirt_purchased: false,
        shirt_size: null,
        notes: null,
        status: 'pending',
        created_at: '2026-11-11T10:00:00Z',
        updated_at: '2026-11-11T10:00:00Z',
        guardian: null,
      },
      {
        id: '3',
        protocol: 'P3',
        cpf_hash: null,
        full_name: 'Cancelado Ignorado',
        birth_date: '2010-05-01',
        phone: null,
        email: null,
        congregation: 'Templo Central',
        locality: null,
        is_resident: true,
        registered_at: '2026-11-11T10:00:00Z',
        shirt_purchased: true,
        shirt_size: 'G',
        notes: null,
        status: 'cancelled',
        created_at: '2026-11-11T10:00:00Z',
        updated_at: '2026-11-11T10:00:00Z',
        guardian: null,
      },
    ];

    const m = computeCoordinatorMetrics(sample);
    expect(m.active).toBe(2);
    expect(m.cancelled).toBe(1);
    expect(m.residents).toBe(1);
    expect(m.nonResidents).toBe(1);
    expect(m.adults).toBe(1);
    expect(m.minors).toBe(1);
    expect(m.minorsWithoutGuardian).toHaveLength(1);
    expect(m.shirtsPurchased).toBe(1);
    expect(m.shirtsNotPurchased).toBe(1);
    expect(m.byCongregation).toHaveLength(2);
  });
});
