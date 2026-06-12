import { useT } from '../../i18n/useT';

interface Category { id: string; name: string; description: string; }

function getCategories(t: (k: string) => string): Category[] {
  return [
    { id: 'proto-cat-1', name: t('proto.catGreenfield'),  description: t('proto.catGreenDesc') },
    { id: 'proto-cat-2', name: t('proto.catRefactor'),    description: t('proto.catRefactorDesc') },
    { id: 'proto-cat-3', name: t('proto.catIntegration'), description: t('proto.catIntegrationDesc') },
    { id: 'proto-cat-4', name: t('proto.catMaintenance'), description: t('proto.catMaintenanceDesc') },
  ];
}

interface Props {
  quantities: Record<string, number>;
  comment: string;
  onQuantityChange: (catId: string, value: number) => void;
  onCommentChange: (value: string) => void;
  readOnly?: boolean;
}

export function PrototypeEstimationForm({
  quantities,
  comment,
  onQuantityChange,
  onCommentChange,
  readOnly,
}: Props) {
  const t = useT();
  const categories = getCategories(t);
  const total = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('proto.title')}
      </h4>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((cat) => (
          <div key={cat.id}>
            <label
              className="block text-xs font-medium text-slate-600 mb-1"
              title={cat.description}
            >
              {cat.name}
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={quantities[cat.id] ?? 0}
              onChange={(e) => onQuantityChange(cat.id, Math.max(0, Number(e.target.value) || 0))}
              disabled={readOnly}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-white disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {t('proto.total', { n: total })}
      </p>

      <textarea
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        disabled={readOnly}
        placeholder={t('proto.commentPlaceholder')}
        rows={2}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:bg-white disabled:opacity-60"
      />
    </div>
  );
}
