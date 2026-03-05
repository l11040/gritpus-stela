import { FileText, Kanban, Sparkles } from 'lucide-react';

export function AuthHero() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-zinc-950">
      {/* Dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #52525b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating geometric shapes */}
      <div className="pointer-events-none absolute inset-0">
        {/* Large circle */}
        <div
          className="absolute -top-16 -right-16 h-64 w-64 rounded-full border border-zinc-800"
          style={{ animation: 'float-slow 8s ease-in-out infinite' }}
        />
        <div
          className="absolute -top-12 -right-12 h-52 w-52 rounded-full border border-zinc-800/60"
          style={{ animation: 'float-slow 8s ease-in-out infinite 0.5s' }}
        />

        {/* Rotated square */}
        <div
          className="absolute bottom-32 left-12 h-20 w-20 rotate-45 border border-zinc-800"
          style={{ animation: 'float-medium 6s ease-in-out infinite' }}
        />

        {/* Small dots */}
        <div
          className="absolute top-1/4 left-1/4 h-2.5 w-2.5 rounded-full bg-zinc-500/40"
          style={{ animation: 'pulse-subtle 4s ease-in-out infinite' }}
        />
        <div
          className="absolute top-2/3 right-1/3 h-2 w-2 rounded-full bg-zinc-500/30"
          style={{ animation: 'pulse-subtle 5s ease-in-out infinite 1s' }}
        />
        <div
          className="absolute bottom-1/4 left-2/3 h-1.5 w-1.5 rounded-full bg-zinc-400/35"
          style={{ animation: 'pulse-subtle 3s ease-in-out infinite 2s' }}
        />

        {/* Decorative lines SVG */}
        <svg className="absolute bottom-16 right-8 h-32 w-32 opacity-10" viewBox="0 0 128 128">
          <line
            x1="0" y1="0" x2="128" y2="128"
            stroke="#a1a1aa" strokeWidth="1"
            strokeDasharray="200"
            style={{ animation: 'draw-line 3s ease-out forwards' }}
          />
          <line
            x1="40" y1="0" x2="128" y2="88"
            stroke="#a1a1aa" strokeWidth="1"
            strokeDasharray="200"
            style={{ animation: 'draw-line 3s ease-out 0.5s forwards' }}
          />
          <line
            x1="80" y1="0" x2="128" y2="48"
            stroke="#a1a1aa" strokeWidth="1"
            strokeDasharray="200"
            style={{ animation: 'draw-line 3s ease-out 1s forwards' }}
          />
        </svg>

        {/* Gradient glows */}
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-zinc-700/15 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-48 w-48 rounded-full bg-zinc-600/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
        <div />

        {/* Center content */}
        <div className="space-y-8">
          <h2 className="text-[2.5rem] leading-[1.15] font-bold tracking-tight text-zinc-50">
            회의록에서
            <br />
            <span className="text-zinc-400">
              액션 플랜
            </span>
            까지,
            <br />
            한번에.
          </h2>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-zinc-500">
            AI가 회의록을 분석하고, 핵심 액션 아이템을 자동으로 추출합니다.
            칸반 보드로 팀의 진행 상황을 한눈에 관리하세요.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-xs text-zinc-400">
              <FileText className="size-3.5" />
              회의록 분석
            </div>
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-xs text-zinc-400">
              <Sparkles className="size-3.5" />
              AI 추출
            </div>
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-xs text-zinc-400">
              <Kanban className="size-3.5" />
              칸반 보드
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <p className="text-xs text-zinc-600">
          Gritpus Stela &mdash; 팀의 실행력을 높이는 도구
        </p>
      </div>
    </div>
  );
}
