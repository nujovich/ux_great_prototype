import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import type { EstimationComment, Metier } from '../../types';

interface Props {
  comments: EstimationComment[];
  metier: Metier;
  onAdd: (text: string) => void;
  readOnly?: boolean;
}

export function CommentSection({ comments, metier, onAdd, readOnly }: Props) {
  const [text, setText] = useState('');
  const t = useT();
  const filtered = comments.filter((c) => c.metier === metier);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  }

  return (
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <MessageSquare size={12} /> {t('comments.title', { metier })}
      </h4>

      {filtered.length === 0 && (
        <p className="text-xs text-slate-400">{t('comments.empty')}</p>
      )}

      {filtered.map((c) => (
        <div key={c.id} className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-medium">{c.author}</span>{' '}
          <span className="text-slate-400">
            {new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          <p className="mt-0.5 whitespace-pre-wrap">{c.text}</p>
        </div>
      ))}

      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t('comments.placeholder')}
            className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <Button size="sm" variant="secondary" onClick={handleSubmit} disabled={!text.trim()}>
            <Send size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
