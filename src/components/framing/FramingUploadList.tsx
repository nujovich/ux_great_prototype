import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore } from '../../store/framingStore';
import type { FramingUpload } from '../../types/framing';

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * Task 6 (HIW-452 remediation) — per-file management, mirroring the POC's
 * file selector + delete flow (1_Framing_File_Review.py:58-136). Lists every
 * upload with a delete control behind a confirm step; the deletion rule
 * itself (which rows actually go away) lives entirely in the store's
 * deleteUpload — this component only renders the list and confirms.
 */
export function FramingUploadList() {
  const uploads = useFramingStore((s) => s.uploads);
  const deleteUpload = useFramingStore((s) => s.deleteUpload);
  // Calling can() inside the selector keeps this reactive to role switches —
  // selecting s.can itself would return a stable function reference and go
  // stale on a role switch.
  const canDelete = useRoleStore((s) => s.can('upload:framing-file'));
  const t = useT();
  const [pending, setPending] = useState<FramingUpload | null>(null);

  if (uploads.length === 0) return null;

  // Most recent upload first.
  const ordered = [...uploads].reverse();

  function confirmDelete() {
    if (!pending) return;
    deleteUpload(pending.id);
    setPending(null);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-semibold text-slate-800">{t('framing.uploads.title')}</h3>
      <ul className="mt-2 divide-y divide-slate-100">
        {ordered.map((upload) => (
          <li
            key={upload.id}
            data-testid={`upload-${upload.id}`}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{upload.fileName}</p>
              <p className="text-xs text-slate-500">
                {formatUploadedAt(upload.uploadedAt)}
                {' · '}
                {t('framing.uploads.rowCount', { count: upload.plNumbers.length })}
              </p>
            </div>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t('framing.uploads.delete', { fileName: upload.fileName })}
                onClick={() => setPending(upload)}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('framing.uploads.confirmTitle')}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPending(null)}>
              {t('framing.uploads.cancel')}
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete}>
              {t('framing.uploads.confirmDelete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {pending && t('framing.uploads.confirmBody', { fileName: pending.fileName })}
        </p>
      </Modal>
    </div>
  );
}
