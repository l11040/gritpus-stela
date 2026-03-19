'use client';

import { useState, useCallback } from 'react';
import type { MdDocument } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadDocument = useCallback(
    async (title: string, fileOrContent: File | string): Promise<MdDocument> => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('title', title);

        if (typeof fileOrContent === 'string') {
          formData.append('content', fileOrContent);
        } else {
          formData.append('file', fileOrContent);
        }

        const res = await fetch(`${API_BASE}/md-documents`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`Upload failed: ${res.status}`);
        }

        return res.json();
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { uploadDocument, isUploading };
}
