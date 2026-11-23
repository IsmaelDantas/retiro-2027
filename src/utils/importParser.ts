import { normalizeCpf, isValidCpf } from './cpf';
import { isMinorAtRetreat } from './date';
import { normalizePhoneDigits } from './phone';
import type { ParticipantStatus } from '../types/database';

export type ImportTargetField =
  | 'protocol'
  | 'full_name'
  | 'cpf'
  | 'locality'
  | 'email'
  | 'is_resident'
  | 'status'
  | 'birth_date'
  | 'phone'
  | 'congregation'
  | 'guardian_full_name'
  | 'guardian_phone'
  | 'registered_at';

export type ColumnMapping = Partial<Record<ImportTargetField, string>>;

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: ';' | ',';
}

export interface NormalizedImportRow {
  rowIndex: number;
  protocol: string | null;
  full_name: string;
  cpf_digits: string;
  cpf_valid: boolean;
  locality: string | null;
  email: string | null;
  is_resident: boolean | null;
  status: ParticipantStatus;
  birth_date: string | null;
  phone: string | null;
  congregation: string | null;
  guardian_full_name: string;
  guardian_phone: string;
  registered_at: string | null;
  is_minor: boolean;
  warnings: string[];
  errors: string[];
}

export const IMPORT_FIELD_LABELS: Record<ImportTargetField, string> = {
  protocol: 'Protocolo',
  full_name: 'Nome completo *',
  cpf: 'CPF (somente hash)',
  birth_date: 'Data de nascimento',
  phone: 'WhatsApp',
  email: 'E-mail',
  congregation: 'Congregação / Igreja',
  locality: 'Localidade',
  is_resident: 'Ficará interno',
  status: 'Situação',
  guardian_full_name: 'Responsável',
  guardian_phone: 'WhatsApp responsável',
  registered_at: 'Registrado em',
};

const HEADER_SYNONYMS: Record<ImportTargetField, string[]> = {
  protocol: ['protocolo', 'protocol'],
  full_name: ['nome', 'nome completo', 'full_name'],
  cpf: ['cpf'],
  locality: ['localidade', 'local', 'locality'],
  email: ['e-mail', 'email'],
  is_resident: ['ficará interno', 'ficara interno', 'ficara_interno', 'interno', 'is_resident'],
  status: ['situação', 'situacao', 'status'],
  birth_date: ['nascimento', 'data de nascimento', 'birth_date'],
  phone: ['whatsapp', 'telefone', 'phone'],
  congregation: ['igreja', 'congregação', 'congregacao', 'congregation'],
  guardian_full_name: ['responsável', 'responsavel', 'responsavel_nome', 'nome do responsável'],
  guardian_phone: ['whatsapp responsável', 'whatsapp responsavel', 'responsavel_whatsapp', 'telefone do responsável'],
  registered_at: ['registrado em', 'criado_em', 'data de inscrição', 'registered_at'],
};

/** Remove o prefixo de proteção anti-fórmula (') gerado pelo inscritos.php */
export function stripFormulaPrefix(value: string): string {
  const trimmed = value.trim();
  if (/^'[=+\-@\t\r]/.test(trimmed)) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
}

/** Parseia uma linha CSV respeitando aspas duplas e delimitador */
function parseCsvLines(content: string, delimiter: ';' | ','): string[][] {
  const clean = content.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      currentRow.push(stripFormulaPrefix(currentCell));
      currentCell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      currentRow.push(stripFormulaPrefix(currentCell));
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(stripFormulaPrefix(currentCell));
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/** Analisa texto CSV (detectando automaticamente `;` do PHP ou `,`) */
export function parseCsvText(content: string): ParsedCsvData {
  const firstLine = content.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  const semiCols = firstLine.split(';').length;
  const commaCols = firstLine.split(',').length;
  const delimiter: ';' | ',' = semiCols >= commaCols ? ';' : ',';

  const matrix = parseCsvLines(content, delimiter);
  if (matrix.length === 0) {
    return { headers: [], rows: [], delimiter };
  }

  const headers = matrix[0].map((h) => h.trim());
  const rows = matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cells[idx] ?? '';
    });
    return record;
  });

  return { headers, rows, delimiter };
}

/** Detecta automaticamente o mapeamento das colunas do inscritos.php */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    norm: h.toLowerCase().trim(),
  }));

  (Object.keys(HEADER_SYNONYMS) as ImportTargetField[]).forEach((field) => {
    const synonyms = HEADER_SYNONYMS[field];
    const match = normalizedHeaders.find((h) => synonyms.includes(h.norm));
    if (match) {
      mapping[field] = match.raw;
    }
  });

  return mapping;
}

function parseBrOrIsoDate(raw: string): string | null {
  const clean = raw.trim();
  if (!clean) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  return null;
}

function parseTimestamp(raw: string): string | null {
  const clean = raw.trim();
  if (!clean) return null;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean.replace(' ', 'T');
  }
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseResidentFlag(raw: string): boolean | null {
  const norm = raw.trim().toLowerCase();
  if (!norm) return null;
  if (['sim', 's', 'true', '1', 'interno'].includes(norm)) return true;
  if (['nao', 'não', 'n', 'false', '0', 'externo'].includes(norm)) return false;
  return null;
}

function parseSituation(raw: string): ParticipantStatus {
  const norm = raw.trim().toLowerCase();
  if (['ativa', 'confirmado', 'confirmed'].includes(norm)) return 'confirmed';
  if (['cancelada', 'cancelado', 'cancelled'].includes(norm)) return 'cancelled';
  return 'pending';
}

/** Normaliza e valida as linhas importadas antes de gravar */
export function normalizeImportRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): NormalizedImportRow[] {
  const seenProtocols = new Set<string>();
  const seenCpfs = new Set<string>();

  return rows.map((raw, idx) => {
    const getVal = (field: ImportTargetField): string => {
      const col = mapping[field];
      return col ? (raw[col] ?? '').trim() : '';
    };

    const protocol = getVal('protocol') || null;
    const full_name = getVal('full_name');
    const cpfRaw = getVal('cpf');
    const cpf_digits = normalizeCpf(cpfRaw);
    const cpf_valid = cpf_digits.length > 0 ? isValidCpf(cpf_digits) : true;
    const birthRaw = getVal('birth_date');
    const birth_date = parseBrOrIsoDate(birthRaw);
    const phoneDigits = normalizePhoneDigits(getVal('phone'));
    const phone = phoneDigits || getVal('phone') || null;
    const email = getVal('email') || null;
    const congregation = getVal('congregation') || null;
    const locality = getVal('locality') || null;
    const is_resident = parseResidentFlag(getVal('is_resident'));
    const status = parseSituation(getVal('status'));
    const guardian_full_name = getVal('guardian_full_name');
    const guardian_phone = normalizePhoneDigits(getVal('guardian_phone')) || getVal('guardian_phone');
    const registered_at = parseTimestamp(getVal('registered_at'));

    const is_minor = isMinorAtRetreat(birth_date);
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!full_name) {
      errors.push('Nome completo ausente.');
    }

    if (birthRaw && !birth_date) {
      warnings.push(`Data de nascimento inválida ("${birthRaw}").`);
    }

    if (cpf_digits.length > 0 && !cpf_valid) {
      warnings.push('CPF com dígitos verificadores inválidos.');
    }

    if (is_minor && (!guardian_full_name || !guardian_phone)) {
      warnings.push('Menor de 18 anos (em 06/02/2027) sem responsável/WhatsApp completo.');
    }

    if (protocol) {
      if (seenProtocols.has(protocol)) {
        errors.push(`Protocolo duplicado no arquivo (${protocol}).`);
      } else {
        seenProtocols.add(protocol);
      }
    }

    if (cpf_digits.length === 11) {
      if (seenCpfs.has(cpf_digits)) {
        errors.push('CPF duplicado dentro do próprio arquivo CSV.');
      } else {
        seenCpfs.add(cpf_digits);
      }
    }

    return {
      rowIndex: idx + 2, // Considerando cabeçalho na linha 1
      protocol,
      full_name,
      cpf_digits,
      cpf_valid,
      locality,
      email,
      is_resident,
      status,
      birth_date,
      phone,
      congregation,
      guardian_full_name,
      guardian_phone,
      registered_at,
      is_minor,
      warnings,
      errors,
    };
  });
}

/** Mascara CPF apenas para conferência visual transitória em memória (nunca salvo) */
export function maskCpfTransient(digits: string): string {
  if (digits.length !== 11) return '—';
  return `***.***.***-${digits.slice(9)}`;
}
