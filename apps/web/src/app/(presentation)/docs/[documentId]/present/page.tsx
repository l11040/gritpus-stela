'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { PresentationMode } from '@/features/document-viewer/components/presentation-mode';
import { AiPresentationMode } from '@/features/document-viewer/components/ai-presentation-mode';
import { useSlidesGenerate } from '@/features/document-viewer/hooks/use-slides-generate';
import type { MdDocument, SlidesJson } from '@/features/document-viewer/types';
import { Loader2, FileText, Sparkles } from 'lucide-react';

type Mode = 'select' | 'markdown' | 'ai';

function hasCachedSlides(doc: MdDocument): doc is MdDocument & { slidesJson: SlidesJson } {
  return !!(doc.slidesJson && Array.isArray(doc.slidesJson.slides) && doc.slidesJson.slides.length > 1);
}

export default function PresentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [document, setDocument] = useState<MdDocument | null>(null);
  const [mode, setMode] = useState<Mode>('select');
  const { slides, isGenerating, error, generate, setSlides } = useSlidesGenerate(documentId);
  const [generateTriggered, setGenerateTriggered] = useState(false);

  const initialMode = searchParams.get('mode');

  useEffect(() => {
    fetcher<MdDocument>({
      url: `/md-documents/${documentId}`,
      method: 'GET',
    }).then((doc) => {
      setDocument(doc);
      // 캐시된 슬라이드가 있으면 slides state에 세팅
      if (hasCachedSlides(doc)) {
        setSlides(doc.slidesJson);
      }
    });
  }, [documentId, setSlides]);

  useEffect(() => {
    if (initialMode === 'markdown' || initialMode === 'ai') {
      setMode(initialMode);
    }
  }, [initialMode]);

  // AI 모드에서 슬라이드가 없으면 생성
  useEffect(() => {
    if (mode === 'ai' && document && !slides && !isGenerating && !error && !generateTriggered) {
      setGenerateTriggered(true);
      generate();
    }
  }, [mode, document, slides, isGenerating, error, generate, generateTriggered]);

  const handleExit = () => router.push(`/docs/${documentId}`);

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-sm text-white/60">로딩 중...</div>
      </div>
    );
  }

  // 마크다운 모드
  if (mode === 'markdown') {
    return <PresentationMode content={document.currentContent || ''} onExit={handleExit} />;
  }

  // AI 모드
  if (mode === 'ai') {
    if (slides) {
      return <AiPresentationMode slidesJson={slides} onExit={handleExit} />;
    }

    if (isGenerating) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-white/60">AI가 슬라이드를 구성하고 있습니다...</p>
          <p className="text-xs text-white/30">문서 내용을 분석하여 최적의 프레젠테이션을 만들고 있습니다</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-900">
          <p className="text-sm text-red-400">슬라이드 생성에 실패했습니다</p>
          <p className="text-xs text-white/40">{error}</p>
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => { setGenerateTriggered(false); generate(); }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              다시 시도
            </button>
            <button
              onClick={() => setMode('select')}
              className="rounded-md bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/20"
            >
              돌아가기
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  // 모드 선택 화면
  const cached = hasCachedSlides(document);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-900">
      <div className="w-full max-w-lg px-6">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">프레젠테이션 모드</h2>
        <p className="mb-8 text-center text-sm text-white/50">원하는 발표 방식을 선택하세요</p>

        <div className="grid gap-4">
          <button
            onClick={() => setMode('markdown')}
            className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700">
              <FileText className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">마크다운 기반</div>
              <div className="mt-1 text-xs leading-relaxed text-white/40">
                문서의 h2 제목을 기준으로 슬라이드를 나눕니다. 원본 마크다운 콘텐츠를 그대로 보여줍니다.
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('ai')}
            className="group flex items-start gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 text-left transition-all hover:border-blue-500/40 hover:bg-blue-500/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">AI 구성</span>
                {cached && (
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">생성됨</span>
                )}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-white/40">
                {cached
                  ? 'AI가 구성한 슬라이드가 준비되어 있습니다. 바로 시작할 수 있습니다.'
                  : 'AI가 문서를 분석하여 발표에 최적화된 슬라이드를 구성합니다. 생성에 1~2분이 소요됩니다.'}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={handleExit}
          className="mt-6 w-full text-center text-xs text-white/30 hover:text-white/50"
        >
          문서로 돌아가기
        </button>
      </div>
    </div>
  );
}
