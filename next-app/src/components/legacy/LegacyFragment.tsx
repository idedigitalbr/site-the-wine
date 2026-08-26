import { getLegacyChunk } from '@/lib/legacyMarkup';

type LegacyFragmentProps = {
  name: string;
  startMarker: string;
  endMarker?: string;
};

export function LegacyFragment({ name, startMarker, endMarker }: LegacyFragmentProps) {
  const markup = getLegacyChunk(startMarker, endMarker);

  return (
    <div
      data-legacy-fragment={name}
      style={{ display: 'contents' }}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
