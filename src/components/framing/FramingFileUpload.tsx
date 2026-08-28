import { useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore } from '../../store/framingStore';
import {
  FramingParseError, isXlsxFileName, parseFramingMatrix, readFramingWorkbook,
} from '../../lib/framing/parseFramingFile';

/**
 * §4.1 — one .xlsx per upload, Admin/PMO only. CPO gets NO upload element at all
 * (HIW-458 AC#2): a conditional render, never a disabled control.
 */
export function FramingFileUpload() {
  // Calling can() inside the selector keeps this reactive to role switches.
  const canUpload = useRoleStore((s) => s.can('upload:framing-file'));
  const lines = useFramingStore((s) => s.lines);
  const ingestRows = useFramingStore((s) => s.ingestRows);
  const t = useT();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canUpload) return null;

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setNotice(null);
    if (picked && !isXlsxFileName(picked.name)) {
      setFile(null);
      setError(t('framing.upload.notXlsx'));
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const { matrix } = readFramingWorkbook(buffer);
      const existingCodes = lines.map((l) => l.plNumber);
      const rows = parseFramingMatrix(matrix, file.name, existingCodes);
      const summary = ingestRows(rows, file.name);
      let message = t('framing.upload.success', {
        fileName: summary.fileName, rfq: summary.rfqCount, rfi: summary.rfiCount,
      });
      // I4 — the upload is authoritative and silently drops any unsaved edit
      // on the pl_numbers it carries; tell the user how many were lost.
      if (summary.discardedEditsCount > 0) {
        message += ` ${t('framing.upload.discardedEdits', { count: summary.discardedEditsCount })}`;
      }
      setNotice(message);
      setFile(null);
    } catch (err) {
      // I2 — map the known FramingParseError codes to their own translated
      // message; anything else (corrupt/encrypted workbook, etc.) gets a
      // distinct generic fallback, never the "no worksheet" text.
      if (err instanceof FramingParseError) {
        const key = err.code === 'noWorksheet'
          ? 'framing.upload.parseError'
          : 'framing.upload.noHeaderRowError';
        setError(t(key));
      } else {
        setError(t('framing.upload.genericError'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500" htmlFor="framing-file-input">
            {t('framing.upload.label')}
          </label>
          <input
            id="framing-file-input"
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={handleSelect}
            className="mt-1 text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
        <Button onClick={handleUpload} disabled={!file || busy}>
          <Upload size={14} /> {busy ? t('framing.upload.busy') : t('framing.upload.button')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}
