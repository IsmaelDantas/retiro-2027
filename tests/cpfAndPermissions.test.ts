import { describe, expect, it } from 'vitest';
import { hashCpfFallback, isValidCpf, normalizeCpf } from '../src/utils/cpf';
import {
  canChangeTargetRole,
  canDeleteTargetUser,
  canEditTargetUser,
  canManageData,
  canManageUsers,
  getAssignableRoles,
  getRoleLabel,
  isAdmin,
  isViewer,
} from '../src/utils/permissions';
import {
  formatUserHandle,
  isValidUsername,
  normalizeUsername,
  toAuthEmail,
} from '../src/utils/username';

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

describe('Login por nome de usuário', () => {
  it('normaliza e converte nomes de usuário preservando e-mails legados', () => {
    expect(normalizeUsername('Irmão Claudejan')).toBe('irmao.claudejan');
    expect(isValidUsername('claudejan')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);

    expect(toAuthEmail('claudejan')).toBe('claudejan@retiro2027.app');
    expect(toAuthEmail('ismcondan2019@gmail.com')).toBe('ismcondan2019@gmail.com');
    expect(formatUserHandle({ username: 'claudejan', email: 'claudejan@retiro2027.app' })).toBe(
      '@claudejan'
    );
  });
});

describe('Permissões de acesso (admin / coordinator / supervisor)', () => {
  it('permite escrita de dados para admin e coordinator e bloqueia para supervisor (viewer)', () => {
    expect(canManageData('admin')).toBe(true);
    expect(canManageData('coordinator')).toBe(true);
    expect(canManageData('viewer')).toBe(false);
    expect(canManageData(null)).toBe(false);

    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('coordinator')).toBe(false);
    expect(isViewer('viewer')).toBe(true);
    expect(getRoleLabel('viewer')).toBe('Supervisor(a)');
  });

  it('aplica hierarquia: somente admin exclui/altera outros coordenadores; supervisor nunca gerencia contas', () => {
    expect(canManageUsers('admin')).toBe(true);
    expect(canManageUsers('coordinator')).toBe(true);
    expect(canManageUsers('viewer')).toBe(false);

    expect(getAssignableRoles('admin')).toEqual(['admin', 'coordinator', 'viewer']);
    expect(getAssignableRoles('coordinator')).toEqual(['coordinator', 'viewer']);
    expect(getAssignableRoles('viewer')).toEqual([]);

    // Exclusão: apenas admin exclui coordenadores ou outros admins
    expect(canDeleteTargetUser('admin', 'coordinator', false)).toBe(true);
    expect(canDeleteTargetUser('admin', 'admin', true)).toBe(false);
    expect(canDeleteTargetUser('coordinator', 'coordinator', false)).toBe(false);
    expect(canDeleteTargetUser('coordinator', 'admin', false)).toBe(false);
    expect(canDeleteTargetUser('coordinator', 'viewer', false)).toBe(true);

    // Edição e troca de papel
    expect(canEditTargetUser('coordinator', 'admin', false)).toBe(false);
    expect(canEditTargetUser('coordinator', 'coordinator', false)).toBe(true);
    expect(canChangeTargetRole('coordinator', 'coordinator', 'viewer', false)).toBe(false);
    expect(canChangeTargetRole('coordinator', 'viewer', 'coordinator', false)).toBe(true);
    expect(canChangeTargetRole('coordinator', 'viewer', 'admin', false)).toBe(false);
    expect(canChangeTargetRole('admin', 'coordinator', 'viewer', false)).toBe(true);
  });
});
