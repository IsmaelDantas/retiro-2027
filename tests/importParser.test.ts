import { describe, expect, it } from 'vitest';
import {
  detectColumnMapping,
  maskCpfTransient,
  normalizeImportRows,
  parseCsvText,
  stripFormulaPrefix,
} from '../src/utils/importParser';
import { calculateAgeAtRetreat, isMinorAtRetreat } from '../src/utils/date';

const SAMPLE_CHURCH_CSV = `\uFEFFProtocolo;Nome;CPF;Localidade;E-mail;Ficará interno;Situação;Nascimento;Idade;WhatsApp;Igreja;Responsável;WhatsApp responsável;Registrado em
RET-2027-001;João Exemplo;52998224725;Centro;joao@exemplo.com;sim;ativa;06/02/2009;18;(88) 99999-0001;Templo Central;;;2026-11-10 14:20:00
RET-2027-002;'=Maria Menor;11144477735;Sítio Fictício;maria@exemplo.com;nao;ativa;07/02/2009;17;(88) 99999-0002;Congregação Sul;Ana Responsável;(88) 98888-0002;2026-11-11 09:00:00
RET-2027-003;Pedro Sem Resp;;Centro;;sim;cancelada;10/05/2011;15;(88) 99999-0003;Templo Central;;;2026-11-12 10:00:00`;

describe('importParser — formato oficial inscritos.php', () => {
  it('remove BOM UTF-8, detecta delimitador ";" e mapeia as 14 colunas', () => {
    const parsed = parseCsvText(SAMPLE_CHURCH_CSV);
    expect(parsed.delimiter).toBe(';');
    expect(parsed.headers).toHaveLength(14);
    expect(parsed.rows).toHaveLength(3);

    const mapping = detectColumnMapping(parsed.headers);
    expect(mapping.protocol).toBe('Protocolo');
    expect(mapping.full_name).toBe('Nome');
    expect(mapping.cpf).toBe('CPF');
    expect(mapping.is_resident).toBe('Ficará interno');
    expect(mapping.status).toBe('Situação');
    expect(mapping.guardian_full_name).toBe('Responsável');
    expect(mapping.guardian_phone).toBe('WhatsApp responsável');
  });

  it('remove prefixo anti-fórmula e normaliza datas, status, interno e menoridade em 06/02/2027', () => {
    expect(stripFormulaPrefix("'=Maria")).toBe('=Maria');
    expect(stripFormulaPrefix('Maria')).toBe('Maria');

    const parsed = parseCsvText(SAMPLE_CHURCH_CSV);
    const mapping = detectColumnMapping(parsed.headers);
    const normalized = normalizeImportRows(parsed.rows, mapping);

    // Linha 1: nascido em 06/02/2009 completa 18 anos exatamente em 06/02/2027
    expect(normalized[0].birth_date).toBe('2009-02-06');
    expect(calculateAgeAtRetreat('2009-02-06')).toBe(18);
    expect(isMinorAtRetreat('2009-02-06')).toBe(false);
    expect(normalized[0].is_resident).toBe(true);
    expect(normalized[0].status).toBe('confirmed');
    expect(normalized[0].warnings).toHaveLength(0);

    // Linha 2: nascido em 07/02/2009 ainda tem 17 anos em 06/02/2027 (menor com responsável)
    expect(normalized[1].full_name).toBe('=Maria Menor');
    expect(isMinorAtRetreat('2009-02-07')).toBe(true);
    expect(normalized[1].is_resident).toBe(false);
    expect(normalized[1].warnings).toHaveLength(0);

    // Linha 3: menor sem responsável deve gerar alerta e situação cancelada -> cancelled
    expect(normalized[2].status).toBe('cancelled');
    expect(normalized[2].is_minor).toBe(true);
    expect(normalized[2].warnings.some((w) => w.includes('sem responsável'))).toBe(true);
  });

  it('detecta duplicidade de protocolo e CPF dentro do mesmo CSV e mascara CPF transitório', () => {
    const dupCsv = `Protocolo;Nome;CPF
RET-001;Jovem Um;52998224725
RET-001;Jovem Dois;52998224725`;

    const parsed = parseCsvText(dupCsv);
    const mapping = detectColumnMapping(parsed.headers);
    const normalized = normalizeImportRows(parsed.rows, mapping);

    expect(normalized[0].errors).toHaveLength(0);
    expect(normalized[1].errors.length).toBeGreaterThanOrEqual(2);
    expect(maskCpfTransient('52998224725')).toBe('***.***.***-25');
  });
});
