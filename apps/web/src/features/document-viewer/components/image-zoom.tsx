'use client';

import { useState } from 'react';

interface ImageZoomProps {
  src?: string;
  alt?: string;
}

export function ImageZoom({ src, alt }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt || ''}
        className="my-4 max-w-full cursor-zoom-in rounded-lg transition-shadow hover:shadow-lg"
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex cursor-zoom-out items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <img
            src={src}
            alt={alt || ''}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
