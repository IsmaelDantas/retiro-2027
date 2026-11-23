import { useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Shield,
  Upload,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';
import { useParticipantsData } from '../contexts/ParticipantsDataContext';
import { useToast } from '../contexts/ToastContext';
import { canManageData } from '../utils/permissions';
import {
  IMPORT_FIELD_LABELS,
  detectColumnMapping,
  maskCpfTransient,
  normalizeImportRows,
  parseCsvText,
  type ColumnMapping,
  type ImportTargetField,
  type ParsedCsvData,
} from '../utils/importParser';
import {
  buildImportPreview,
  executeImport,
  type ImportExecutionResult,
  type ImportPreviewSummary,
} from '../services/import';

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create: { label: 'Novo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  update: { label: 'Atualizar', className: 'bg-primary-50 text-primary-700 border-primary-200' },
  unchanged: { label: 'Sem mudança', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  error: { label: 'Erro', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export function ImportPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { refresh } = useParticipantsData();
  const writable = canManageData(profile?.role);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<ImportPreviewSummary | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);

  const columnOptions = useMemo(() => {
    if (!parsedCsv) return [{ value: '', label: '— Ignorar coluna —' }];
    return [
      { value: '', label: '— Ignorar coluna —' },
      ...parsedCsv.headers.map((h) => ({ value: h, label: h })),
    ];
  }, [parsedCsv]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setPreview(null);
    setFileName(file.name);

    const text = await file.text();
    const parsed = parseCsvText(text);

    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      showToast('O arquivo CSV está vazio ou não possui linhas válidas.', 'error');
      setParsedCsv(null);
      return;
    }

    const detected = detectColumnMapping(parsed.headers);
    setParsedCsv(parsed);
    setMapping(detected);

    await runPreview(parsed, detected);
  };

  const runPreview = async (csv: ParsedCsvData, map: ColumnMapping) => {
    setAnalyzing(true);
    try {
      const normalized = normalizeImportRows(csv.rows, map);
      const summary = await buildImportPreview(normalized);
      setPreview(summary);
    } catch {
      showToast('Não foi possível comparar o arquivo com o banco Supabase.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMappingChange = (field: ImportTargetField, headerValue: string) => {
    const next = { ...mapping, [field]: headerValue || undefined };
    setMapping(next);
    setPreview(null);
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await executeImport(preview);
      setResult(res);
      await refresh(true);
      showToast(`Importação concluída: ${res.created} novo(s), ${res.updated} atualizado(s).`);
    } catch {
      showToast('Erro ao executar importação no Supabase.', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!writable) {
    return (
      <Card className="p-6 text-center space-y-3">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Importação restrita</h1>
        <p className="text-sm text-slate-600">
          Apenas administradores e coordenadores podem importar listas de inscrições do site da igreja.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Importar Inscrições (Site da Igreja)
        </h1>
        <p className="text-sm text-slate-600">
          Envie o arquivo <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">retiro_inscritos_2027.csv</code>{' '}
          exportado pelo painel da secretaria (<code className="font-mono text-xs">inscritos.php</code>).
        </p>
      </div>

      {/* LGPD Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200 text-xs text-primary-900">
        <Shield className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Proteção LGPD e Anti-duplicidade Idempotente</p>
          <p>
            O CPF lido do CSV é convertido exclusivamente em hash criptográfico (<code className="font-mono">cpf_hash</code>)
            para evitar inscrições duplicadas e <strong>nunca é salvo em texto puro</strong>. Reimportar o mesmo CSV
            atualiza alterações sem duplicar jovens ou responsáveis.
          </p>
        </div>
      </div>

      {/* Step 1: File Picker */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-bold text-slate-900">1. Selecionar arquivo CSV</h2>
          </div>
          {fileName && (
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {fileName}
            </span>
          )}
        </div>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-primary-400 rounded-xl p-6 cursor-pointer transition-colors bg-slate-50/50">
          <Upload className="w-7 h-7 text-primary-600 mb-2" />
          <span className="text-sm font-semibold text-slate-800">
            Toque para escolher o CSV exportado da igreja
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Suporta separador ponto-e-vírgula (;) com BOM UTF-8 e vírgula (,)
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      </Card>

      {/* Step 2: Column Mapping */}
      {parsedCsv && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">2. Conferência de Colunas</h2>
              <p className="text-xs text-slate-500">
                Delimitador detectado: <code className="font-mono font-bold">{parsedCsv.delimiter}</code> •{' '}
                {parsedCsv.rows.length} linha(s) encontrada(s)
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={analyzing}
              onClick={() => runPreview(parsedCsv, mapping)}
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar Prévia
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(IMPORT_FIELD_LABELS) as ImportTargetField[]).map((field) => (
              <Select
                key={field}
                label={IMPORT_FIELD_LABELS[field]}
                value={mapping[field] ?? ''}
                onChange={(e) => handleMappingChange(field, e.target.value)}
                options={columnOptions}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Step 3: Preview & Confirm */}
      {preview && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">3. Pré-visualização antes de gravar</h2>
              <p className="text-xs text-slate-500">
                Modo de hash CPF:{' '}
                <strong>
                  {preview.hashSource === 'edge-function'
                    ? 'Edge Function (HMAC-SHA256 com segredo)'
                    : 'Hash local SHA-256 (modo demonstração/offline)'}
                </strong>
              </p>
            </div>
            <Button
              onClick={handleConfirmImport}
              loading={importing}
              disabled={preview.counts.create + preview.counts.update === 0}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Importação ({preview.counts.create + preview.counts.update})
            </Button>
          </div>

          {/* Summary counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700">Novos</p>
              <p className="text-2xl font-bold text-emerald-900 tabular-nums">{preview.counts.create}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-50 border border-primary-200">
              <p className="text-xs font-semibold text-primary-700">Atualizações</p>
              <p className="text-2xl font-bold text-primary-900 tabular-nums">{preview.counts.update}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Sem mudança</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums">{preview.counts.unchanged}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">Canceladas</p>
              <p className="text-2xl font-bold text-amber-900 tabular-nums">{preview.counts.cancelled}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-xs font-semibold text-rose-700">Erros</p>
              <p className="text-2xl font-bold text-rose-900 tabular-nums">{preview.counts.error}</p>
            </div>
          </div>

          {preview.counts.minorsWithoutGuardian > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Atenção: <strong>{preview.counts.minorsWithoutGuardian}</strong> menor(es) de 18 anos (em 06/02/2027)
                estão sem responsável ou WhatsApp do responsável completo no CSV.
              </span>
            </div>
          )}

          {/* Table preview */}
          <div
            role="region"
            aria-label="Prévia da importação"
            tabIndex={0}
            className="overflow-x-auto border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <th className="px-3 py-2.5">Ação</th>
                  <th className="px-3 py-2.5">Protocolo</th>
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="px-3 py-2.5">CPF (oculto)</th>
                  <th className="px-3 py-2.5">Congregação</th>
                  <th className="px-3 py-2.5">Interno</th>
                  <th className="px-3 py-2.5">Alertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.items.slice(0, 50).map((item) => {
                  const badge = ACTION_BADGE[item.action];
                  return (
                    <tr key={`${item.row.rowIndex}-${item.row.protocol ?? item.row.full_name}`}>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md border font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{item.row.protocol ?? '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{item.row.full_name || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500">
                        {maskCpfTransient(item.row.cpf_digits)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{item.row.congregation ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.row.is_resident === true ? 'Sim' : item.row.is_resident === false ? 'Não' : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-amber-700">
                        {item.reason || item.row.warnings.join(' ') || 'OK'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.items.length > 50 && (
            <p className="text-xs text-slate-500">
              Exibindo as primeiras 50 linhas de {preview.items.length} na prévia. Todas serão processadas ao confirmar.
            </p>
          )}
        </Card>
      )}

      {/* Result Banner */}
      {result && (
        <Card className="p-5 bg-emerald-50 border-emerald-200 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-emerald-900">Importação finalizada!</h2>
            <Link to="/participants">
              <Button size="sm">Ver Participantes</Button>
            </Link>
          </div>
          <p className="text-sm text-emerald-800">
            Criados: <strong>{result.created}</strong> • Atualizados: <strong>{result.updated}</strong> • Sem
            alterações: <strong>{result.unchanged}</strong> • Falhas: <strong>{result.failed}</strong>
          </p>
        </Card>
      )}
    </div>
  );
}
