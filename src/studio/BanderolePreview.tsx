import { useEffect, useState } from 'react';
import type { PackagingDocument } from './model';
import type { PrintOptions } from './banderoleGeometry';
import { packagingSvg } from './banderoleExport';
export function PackagingPreview({
  document,
  options,
  pageIndex = document.selectedPage,
}: {
  document: PackagingDocument;
  options: PrintOptions;
  pageIndex?: number;
}) {
  const [src, setSrc] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true,
      url = '';
    setError('');
    setSrc('');
    void packagingSvg(document, options, true, pageIndex)
      .then(({ svg }) => {
        if (!active) return;
        url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        setSrc(url);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [
    document,
    pageIndex,
    options.cutMarks,
    options.dieLines,
    options.innerGuides,
    options.textMode,
  ]);
  return (
    <>
      {src && (
        <img
          className="banderoleExportPreview"
          src={src}
          alt={`Vorschau der ${document.kind === 'banderole' ? 'Banderole' : 'Verpackung'} mit gewählten Druckmarken`}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
