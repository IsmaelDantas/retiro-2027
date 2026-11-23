import { describe, expect, it } from 'vitest';
import { hashCpfFallback, isValidCpf, normalizeCpf } from '../src/utils/cpf';
import { canManageData, getRoleLabel, isAdmin, isViewer } from '../src/utils/permissions';

describe('CPF LGPD helpers', () => {
  it('valida dígitos verificadores de CPF corretamente', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-20')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('gera hash SHA-256 determinístico de 64 hex chars sem expor CPF original', async () => {
    const hashA = await hashCpfFallback('529.982.247-25', 'test-scope');
    const hashB = await hashCpfFallback('52998224725', 'test-scope');
    const hashOther = await hashCpfFallback('11144477735', 'test-scope');

    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashOther);
    expect(hashA).not.toContain('52998224725');
  });
});

describe('Permissões de acesso (admin / coordinator / viewer)', () => {
  it('permite escrita para admin e coordinator e bloqueia para viewer/nulo', () => {
    expect(canManageData('admin')).toBe(true);
    expect(canManageData('coordinator')).toBe(true);
    expect(canManageData('viewer')).toBe(false);
    expect(canManageData(null)).toBe(false);

    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('coordinator')).toBe(false);
    expect(isViewer('viewer')).toBe(true);
    expect(getRoleLabel('viewer')).toContain('Somente leitura');
  });
});
