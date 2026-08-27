import { RoleGate } from '../components/shared/RoleGate';
import { useT } from '../i18n/useT';

export function FramingFilePage() {
  return (
    <RoleGate permission="view:framing-file">
      <FramingFileContent />
    </RoleGate>
  );
}

function FramingFileContent() {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('framing.title')}</h1>
        <p className="text-sm text-slate-600">{t('framing.desc')}</p>
      </div>
    </div>
  );
}
