'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { RichEditor } from '@/components/common/rich-editor';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  composeSourceText,
  getCurrentWeekStartDate,
  getIncludeRecurringStorageKey,
  getRecurringMeetingStorageKey,
  shiftWeekStartDate,
  toSlackPasteText,
} from '@/features/weekly-work/utils';
import { WeekDatePicker } from '@/features/weekly-work/components/week-date-picker';
import type { WeeklyType, InputType, WeeklyWorkHistory, WeeklyWorkProject } from '@/features/weekly-work/types';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Mic, MicOff, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  }
}

type GeneratePayload = {
  type: WeeklyType;
  inputType: InputType;
  sourceText: string;
  weekStartDate: string;
  overwriteExisting: true;
  planReferenceId?: string;
  projectId: string;
};

export default function WeeklyWorkNewPage() {
  const router = useRouter();
  const [type, setType] = useState<WeeklyType>('plan');
  const [inputType, setInputType] = useState<InputType>('chat');
  const [weekStartDate, setWeekStartDate] = useState<string>(getCurrentWeekStartDate());
  const [sourceText, setSourceText] = useState('');
  const [planReferenceId, setPlanReferenceId] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [previewResult, setPreviewResult] = useState<WeeklyWorkHistory | null>(null);
  const [markdownDraft, setMarkdownDraft] = useState('');
  const [lastGeneratePayload, setLastGeneratePayload] = useState<GeneratePayload | null>(null);
  const [planHistories, setPlanHistories] = useState<WeeklyWorkHistory[]>([]);
  const [projects, setProjects] = useState<WeeklyWorkProject[]>([]);
  const [projectId, setProjectId] = useState('');

  const [recurringMeetings, setRecurringMeetings] = useState('');
  const [includeRecurringMeetings, setIncludeRecurringMeetings] = useState(true);

  const recognitionRef = useRef<any>(null);

  const loadPlanHistories = async (targetWeekStartDate: string) => {
    const rows = await fetcher<WeeklyWorkHistory[]>({
      url: '/weekly-work/history',
      method: 'GET',
      params: {
        type: 'plan',
        weekStartDate: targetWeekStartDate,
      },
    });

    setPlanHistories(rows);
  };

  useEffect(() => {
    loadPlanHistories(weekStartDate).catch(() => {
      toast.error('참조 가능한 주간 계획을 불러오지 못했습니다.');
    });
  }, [weekStartDate]);

  useEffect(() => {
    fetcher<WeeklyWorkProject[]>({
      url: '/weekly-work/projects',
      method: 'GET',
    }).then((rows) => {
      setProjects(rows);
      if (rows.length > 0 && !projectId) {
        setProjectId(rows[0].id);
      }
    }).catch(() => {
      toast.error('프로젝트 목록을 불러오지 못했습니다.');
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;

    const savedRecurring = window.localStorage.getItem(getRecurringMeetingStorageKey(projectId));
    setRecurringMeetings(savedRecurring || '');

    const savedIncludeRecurring = window.localStorage.getItem(getIncludeRecurringStorageKey(projectId));
    setIncludeRecurringMeetings(savedIncludeRecurring !== '0');
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (!projectId) return;
    window.localStorage.setItem(getRecurringMeetingStorageKey(projectId), recurringMeetings);
  }, [recurringMeetings, projectId]);

  useEffect(() => {
    if (!projectId) return;
    window.localStorage.setItem(
      getIncludeRecurringStorageKey(projectId),
      includeRecurringMeetings ? '1' : '0',
    );
  }, [includeRecurringMeetings, projectId]);

  const startVoiceInput = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      toast.error('브라우저 음성 인식을 지원하지 않습니다. 채팅 입력을 사용해 주세요.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0]?.transcript || '';
        }
      }

      const trimmed = finalChunk.trim();
      if (!trimmed) return;
      setSourceText((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('음성 인식 중 오류가 발생했습니다.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setInputType('voice');
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const moveWeek = (offset: number) => {
    setWeekStartDate((prev) => shiftWeekStartDate(prev, offset));
  };

  const buildGeneratePayload = (): GeneratePayload | null => {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      toast.error('입력 내용을 작성해 주세요.');
      return null;
    }

    if (!projectId) {
      toast.error('프로젝트를 선택해 주세요.');
      return null;
    }

    const composedSourceText = composeSourceText(
      trimmed,
      recurringMeetings,
      type === 'plan' && includeRecurringMeetings,
      weekStartDate,
    );

    return {
      type,
      inputType,
      sourceText: composedSourceText,
      weekStartDate,
      overwriteExisting: true,
      planReferenceId: type === 'report' && planReferenceId ? planReferenceId : undefined,
      projectId,
    };
  };

  const handleGeneratePreview = async () => {
    const payload = buildGeneratePayload();
    if (!payload) return;

    setIsGenerating(true);
    try {
      const generated = await fetcher<WeeklyWorkHistory>({
        url: '/weekly-work/generate',
        method: 'POST',
        data: {
          ...payload,
          previewOnly: true,
        },
      });

      setPreviewResult(generated);
      setMarkdownDraft(generated.markdown);
      setLastGeneratePayload(payload);
      toast.success('우측 미리보기를 생성했습니다. 저장을 눌러야 반영됩니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '미리보기 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedHistory = async () => {
    if (!lastGeneratePayload) {
      toast.error('먼저 생성 버튼으로 미리보기를 만들어 주세요.');
      return;
    }

    const markdown = markdownDraft.trim();
    if (!markdown) {
      toast.error('저장할 Markdown 내용이 비어 있습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await fetcher<WeeklyWorkHistory>({
        url: '/weekly-work/generate',
        method: 'POST',
        data: {
          ...lastGeneratePayload,
          previewOnly: false,
          markdownOverride: markdown,
        },
      });

      setPreviewResult(saved);
      setMarkdownDraft(saved.markdown);
      toast.success('주간 업무를 저장했습니다.');
      router.push('/weekly');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPreviewForSlack = async () => {
    const source = markdownDraft.trim();
    if (!source) {
      toast.error('복사할 내용이 없습니다.');
      return;
    }

    const slackText = toSlackPasteText(source);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(slackText);
      } else {
        throw new Error('Clipboard API not available');
      }

      toast.success('Slack용 형식으로 복사했습니다.');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = slackText;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Slack용 형식으로 복사했습니다.');
      } catch {
        toast.error('복사에 실패했습니다.');
      }
    }
  };

  return (
    <div className="space-y-5 px-6 pt-5 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="size-8">
              <Link href="/weekly" aria-label="뒤로가기">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">주간 업무 추가</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            생성은 미리보기만 수행하며, 저장 버튼을 눌러야 히스토리에 반영됩니다.
          </p>
        </div>

        <Button onClick={handleGeneratePreview} disabled={isGenerating}>
          <Sparkles className="size-4" />
          {isGenerating ? '생성 중...' : '미리보기 생성'}
        </Button>
      </div>

      <div className={previewResult ? 'grid gap-5 xl:grid-cols-[1fr_1fr]' : 'grid gap-5'}>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="프로젝트 선택" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={type} onValueChange={(value) => setType(value as WeeklyType)}>
              <TabsList>
                <TabsTrigger value="plan">주간 계획</TabsTrigger>
                <TabsTrigger value="report">주간 보고</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              type="button"
              variant={isListening ? 'destructive' : 'outline'}
              size="sm"
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              className="h-8"
            >
              {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              {isListening ? '음성 중지' : '음성 입력'}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => moveWeek(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <WeekDatePicker
                value={weekStartDate}
                onChange={setWeekStartDate}
                buttonClassName="h-8 min-w-72 justify-center text-xs"
                allowClear={false}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => moveWeek(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {type === 'report' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">참조할 주간 계획 (선택)</Label>
              <Select
                value={planReferenceId || 'auto'}
                onValueChange={(value) => setPlanReferenceId(value === 'auto' ? '' : value)}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">자동 선택 (같은 주 최신 계획)</SelectItem>
                  {planHistories.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.weekStartDate} · {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">입력 원문</Label>
            <Textarea
              value={sourceText}
              onChange={(e) => {
                setInputType('chat');
                setSourceText(e.target.value);
              }}
              className="min-h-[200px] text-sm"
              placeholder="이번 주 계획/진행 내용을 입력하세요."
            />
          </div>

          {type === 'plan' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">반복 미팅</Label>
                <Button
                  type="button"
                  variant={includeRecurringMeetings ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIncludeRecurringMeetings((prev) => !prev)}
                  className="h-7 text-xs"
                >
                  자동 반영 {includeRecurringMeetings ? 'ON' : 'OFF'}
                </Button>
              </div>
              <Textarea
                value={recurringMeetings}
                onChange={(e) => setRecurringMeetings(e.target.value)}
                className="min-h-[96px] text-sm"
                placeholder={'[매주 화 15:00~17:00] : 개발챕터\n[매주 목 13:30] : 테크 그룹 주간회의'}
              />
              <p className="text-[11px] text-muted-foreground">
                반복 표현은 생성 시 선택 주의 실제 날짜로 자동 변환됩니다.
              </p>
            </div>
          )}
        </section>

        {previewResult && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">생성 미리보기</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyPreviewForSlack}
                  aria-label="Slack 형식으로 복사"
                  title="Slack 형식으로 복사"
                >
                  <Copy className="size-4" />
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveGeneratedHistory} disabled={isSaving}>
                  <Save className="size-4" />
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              생성만으로는 저장되지 않습니다. 우측 결과를 확인/수정한 뒤 저장하세요.
            </p>

            <RichEditor
              key={`${previewResult.id}:${previewResult.markdown.length}:${previewResult.markdown.slice(0, 24)}`}
              defaultValue={previewResult.markdown}
              inputFormat="markdown"
              outputFormat="markdown"
              editable
              onChange={setMarkdownDraft}
              className="min-h-[420px] max-h-[70vh] overflow-y-auto"
            />
          </section>
        )}
      </div>
    </div>
  );
}
