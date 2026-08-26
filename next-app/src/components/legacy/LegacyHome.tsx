import { LegacyBehaviorController } from '@/components/legacy/LegacyBehaviorController';
import { LegacyMenuScripts } from '@/components/menu/LegacyMenuScripts';
import { getLegacyBodyMarkup } from '@/lib/legacyMarkup';

export function LegacyHome() {
  const markup = getLegacyBodyMarkup();

  return (
    <>
      <div
        id="legacy-root"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      <LegacyBehaviorController />
      <LegacyMenuScripts />
    </>
  );
}
