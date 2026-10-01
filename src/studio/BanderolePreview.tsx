import { useEffect, useState } from 'react';
import type { PackagingDocument } from './model';
import type { PrintOptions } from './banderoleGeometry';
import { banderoleSvg } from './banderoleExport';
export function BanderolePreview({
  document,
  options,
}: {
  document: PackagingDocument;
  options: PrintOptions;
}) {
  const [src, setSrc] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true,
      url = '';
    setError('');
    setSrc('');
    void banderoleSvg(document, options)
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
  }, [document, options.cutMarks, options.dieLines, options.innerGuides, options.textMode]);
  return (
    <>
      {src && (
        <img
          className="banderoleExportPreview"
          src={src}
          alt="Vorschau der Banderole mit gewählten Druckmarken"
        />
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
