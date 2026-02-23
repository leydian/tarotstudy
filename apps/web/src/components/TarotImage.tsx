import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import type { TarotImageAttribution } from '../types';
import { api } from '../lib/api';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f6f0e4" />
          <stop offset="100%" stop-color="#d7c9ab" />
        </linearGradient>
      </defs>
      <rect width="240" height="400" fill="url(#g)" rx="18" />
      <rect x="18" y="18" width="204" height="364" fill="none" stroke="#6f5b3a" stroke-width="3" rx="12" />
      <text x="120" y="170" text-anchor="middle" fill="#5e4a2f" font-size="18" font-family="serif">TAROT</text>
      <text x="120" y="200" text-anchor="middle" fill="#5e4a2f" font-size="13" font-family="serif">IMAGE UNAVAILABLE</text>
      <circle cx="120" cy="248" r="26" fill="none" stroke="#6f5b3a" stroke-width="2.5" />
      <path d="M120 227v42M99 248h42" stroke="#6f5b3a" stroke-width="2.5" />
    </svg>`
  );

type TarotImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string;
  sources?: string[];
  cardId?: string;
};

export function TarotImage({ src, sources, alt, cardId, onError, onLoad, ...props }: TarotImageProps) {
  const candidates = sources && sources.length ? sources : src ? [src] : [];

  const report = (stage: string, source?: string) => {
    void api.reportImageFallback({ stage, cardId, source }).catch(() => {});
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const nextIndex = Number(img.dataset.sourceIndex || '0') + 1;
    report('source_error', img.src);
    if (nextIndex < candidates.length) {
      img.dataset.sourceIndex = String(nextIndex);
      img.src = candidates[nextIndex];
      report('retry_next_source', candidates[nextIndex]);
      return;
    }
    img.onerror = null;
    img.src = FALLBACK_IMAGE;
    report('fallback_svg_used', FALLBACK_IMAGE);
    if (onError) onError(event);
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const sourceIndex = Number(img.dataset.sourceIndex || '0');
    report(sourceIndex === 0 ? 'loaded_primary' : 'loaded_secondary', img.src);
    if (onLoad) onLoad(event);
  };

  return (
    <img
      src={candidates[0] || FALLBACK_IMAGE}
      data-source-index="0"
      alt={alt}
      loading={props.loading ?? 'lazy'}
      decoding={props.decoding ?? 'async'}
      fetchPriority={props.fetchPriority ?? 'low'}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
}

export function ImageAttributionNotice({ attribution }: { attribution?: TarotImageAttribution }) {
  if (!attribution) return null;
  return (
    <p className="image-attribution">
      카드 이미지 출처:
      {' '}
      <a href={attribution.sourceUrl} target="_blank" rel="noreferrer">
        {attribution.sourceName}
      </a>
      {' '}· 라이선스:
      {' '}
      <a href={attribution.licenseUrl} target="_blank" rel="noreferrer">
        {attribution.licenseName}
      </a>
    </p>
  );
}
