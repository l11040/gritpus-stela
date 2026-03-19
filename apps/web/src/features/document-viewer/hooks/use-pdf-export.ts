'use client';

import { useState, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export type PdfExportType = 'document' | 'presentation' | 'slides';

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = useCallback(
    async (documentId: string, title: string, type: PdfExportType = 'document') => {
      setIsExporting(true);
      try {
        const pathMap: Record<PdfExportType, string> = {
          document: 'export/pdf',
          presentation: 'export/presentation-pdf',
          slides: 'export/slides-pdf',
        };
        const suffixMap: Record<PdfExportType, string> = {
          document: '',
          presentation: '_프레젠테이션',
          slides: '_AI슬라이드',
        };

        const response = await fetch(
          `${BASE_URL}/md-documents/${documentId}/${pathMap[type]}`,
          {
            method: 'GET',
            credentials: 'include',
          },
        );

        if (!response.ok) {
          throw new Error(`PDF 내보내기 실패 (${response.status})`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}${suffixMap[type]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('PDF export error:', err);
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return { exportPdf, isExporting };
}
