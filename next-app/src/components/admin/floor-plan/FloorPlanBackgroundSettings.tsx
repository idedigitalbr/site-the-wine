'use client';

import { ImagePlus } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import type { FloorPlanBackground } from '@/modules/floor-plan/domain/model';

export type UploadedAsset = { id: string; name: string; naturalWidth: number; naturalHeight: number };
export type FloorPlanBackgroundSettingsProps = { background: FloorPlanBackground | null; disabled?: boolean; onUpload: (asset: UploadedAsset) => void };

function BackgroundHeader({ background, disabled, uploading, inputRef, onChoose, onUpload }: { background: FloorPlanBackground | null; disabled: boolean; uploading: boolean; inputRef: RefObject<HTMLInputElement | null>; onChoose: () => void; onUpload: (file: File) => void }) {
  return <div className="grid gap-3"><div><h2 id="floor-plan-background-title" className="text-base font-semibold text-foreground">Imagem de fundo</h2><p className="mt-1 text-xs text-muted">Use uma planta como referência, atrás das mesas.</p></div><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} /><button type="button" className="admin-primary-button w-full justify-center" disabled={disabled || uploading} onClick={onChoose}><ImagePlus size={16} /> {background ? 'Trocar imagem' : 'Adicionar imagem'}</button></div>;
}

export function FloorPlanBackgroundSettings({ background, disabled = false, onUpload }: FloorPlanBackgroundSettingsProps) {
  const inputRef = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false); const [error, setError] = useState('');
  const upload = async (file: File) => {
    setError(''); setUploading(true);
    try {
      const objectUrl = URL.createObjectURL(file); const image = new Image(); image.src = objectUrl; await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('invalid_image')); }); URL.revokeObjectURL(objectUrl); if (image.naturalWidth < 1 || image.naturalHeight < 1 || image.naturalWidth > 16384 || image.naturalHeight > 16384 || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('invalid_dimensions');
      const form = new FormData(); form.set('file', file); const response = await fetch('/api/admin/floor-plan/assets', { method: 'POST', body: form }); if (!response.ok) throw new Error('upload_failed');
      const result = await response.json() as { id: string }; onUpload({ id: result.id, name: file.name, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    } catch { setError('Não foi possível carregar esta imagem. Use PNG, JPEG ou WebP.'); } finally { setUploading(false); }
  };
  return <section className="floor-plan-background-settings mt-5 border-t border-border pt-4" aria-labelledby="floor-plan-background-title"><BackgroundHeader background={background} disabled={disabled} uploading={uploading} inputRef={inputRef} onChoose={() => inputRef.current?.click()} onUpload={(file) => void upload(file)} />{error && <p role="alert" className="mt-3 text-sm text-status-danger">{error}</p>}</section>;
}
