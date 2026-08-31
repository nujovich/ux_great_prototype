import { useMemo, useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore } from '../../store/framingStore';
import { familyOf, nextPlNumber } from '../../lib/framing/plNumber';
import {
  FramingParseError, isXlsxFileName, parseFramingMatrix, readFramingWorkbook,
} from '../../lib/framing/parseFramingFile';

/**
 * §4.1 — one .xlsx per upload, Admin/PMO only. CPO gets NO upload element at all
 * (HIW-458 AC#2): a conditional render, never a disabled control.
 *
 * The Starting PL Number mirrors the POC's own upload form: the file's PL Number
 * column is not trusted, because real framing files fill it with placeholder text
 * (`New`, `XXXX`, `to be open`) repeated down the column — and since ingest upserts
 * on PL Number, every one of those rows used to collapse into a single line.
 */
export function FramingFileUpload() {
  // Calling can() inside the selector keeps this reactive to role switches.
  const canUpload = useRoleStore((s) => s.can('upload:framing-file'));
  const lines = useFramingStore((s) => s.lines);
  const uploads = useFramingStore((s) => s.uploads);
  const ingestRows = useFramingStore((s) => s.ingestRows);
  const t = useT();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** null = "follow the suggestion", so it re-derives after each upload. */
  const [typedCode, setTypedCode] = useState<string | null>(null);

  const existingCodes = useMemo(() => lines.map((l) => l.plNumber), [lines]);
  const suggestedCode = useMemo(() => nextPlNumber(existingCodes), [existingCodes]);
  const startingCode = typedCode ?? suggestedCode;
  const startingCodeValid = familyOf(startingCode) !== null;

  if (!canUpload) return null;

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setNotice(null);
    if (picked && !isXlsxFileName(picked.name)) {
      setFile(null);
      setError(t('framing.upload.notXlsx'));
      return;
    }
    // POC parity — the POC refuses to re-ingest a file name it already holds.
    // Here it matters more than there: reassignment hands out fresh codes, so a
    // re-upload would no longer upsert onto the rows it created the first time,
    // it would duplicate every one of them. Deleting the earlier upload is the
    // way back in.
    if (picked && uploads.some((u) => u.fileName === picked.name)) {
      setFile(null);
      setError(t('framing.upload.duplicateFile', { fileName: picked.name }));
      return;
    }
    setError(
      startingCodeValid
        ? null
        : t('framing.upload.invalidStartingCode', { code: startingCode }),
    );
    setFile(picked);
  }

  function handleStartingCode(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setTypedCode(next);
    setNotice(null);
    setError(
      familyOf(next) === null
        ? t('framing.upload.invalidStartingCode', { code: next })
        : null,
    );
  }

  async function handleUpload() {
    if (!file || !startingCodeValid) return;
    setBusy(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const { matrix } = readFramingWorkbook(buffer);
      const rows = parseFramingMatrix(matrix, file.name, existingCodes, startingCode);
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
      // Back to following the suggestion, which the ingested rows just advanced.
      setTypedCode(null);
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
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500" htmlFor="framing-starting-pl">
            {t('framing.upload.startingCode')}
          </label>
          <input
            id="framing-starting-pl"
            type="text"
            value={startingCode}
            disabled={busy}
            maxLength={4}
            onChange={handleStartingCode}
            aria-invalid={!startingCodeValid}
            className="mt-1 w-24 rounded border border-slate-300 px-2 py-1.5 text-sm uppercase text-slate-700 aria-[invalid=true]:border-red-400"
          />
        </div>
        <Button onClick={handleUpload} disabled={!file || busy || !startingCodeValid}>
          <Upload size={14} /> {busy ? t('framing.upload.busy') : t('framing.upload.button')}
        </Button>
      </div>
      {startingCodeValid && (
        <p className="mt-2 text-xs text-slate-500">
          {t('framing.upload.startingCodeHelp', {
            example: startingCode,
            next: nextPlNumber([startingCode], familyOf(startingCode) ?? 'LLNN'),
          })}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}
