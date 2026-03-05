# Gritpus Stela

회의록 기반 프로젝트 관리 도구. 매주 회의록에서 AI가 액션 플랜을 추출하고, 칸반 보드로 관리한다.

## 사전 요구사항

- **Node.js** >= 22.0.0
- **pnpm** 10.x
- **Docker** (MySQL 컨테이너 실행용)

## 프로젝트 구조

```
apps/
  web/      — 프론트엔드 (Next.js 15, Tailwind CSS, shadcn/ui)     :50001
  server/   — 백엔드 API (NestJS 11, TypeORM, MySQL)               :50002
  desktop/  — Claude CLI 래퍼 서비스 (Node.js HTTP)                 :50004
packages/
  shared/   — 공유 TypeScript 인터페이스
infra/      — Docker Compose, Traefik, Dockerfile
```

## 로컬 환경 설정

### 1. 의존성 설치

```bash
pnpm install
```

### 2. MySQL 실행

Docker Compose로 MySQL 8.4 컨테이너를 실행한다. (포트: `50003`)

```bash
pnpm docker:dev
```

### 3. 환경 변수 설정

각 앱의 `.env.example`을 복사하여 `.env` 파일을 만든다.

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

**server** (`apps/server/.env`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `50002` | 서버 포트 |
| `DB_HOST` | `localhost` | MySQL 호스트 |
| `DB_PORT` | `50003` | MySQL 포트 |
| `DB_DATABASE` | `gritpus` | DB 이름 |
| `DB_USERNAME` | `gritpus` | DB 사용자 |
| `DB_PASSWORD` | `gritpuspassword` | DB 비밀번호 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 시크릿 |
| `DESKTOP_SERVICE_URL` | `http://localhost:50004` | Desktop 서비스 URL |

**web** (`apps/web/.env`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:50002` | API 서버 주소 |

### 4. 개발 서버 실행

각 앱을 별도 터미널에서 실행한다.

```bash
pnpm dev:server    # 백엔드 API  → http://localhost:50002
pnpm dev:web       # 프론트엔드   → http://localhost:50001
pnpm dev:desktop   # Desktop 서비스 → http://localhost:50004
```

> DB 마이그레이션은 서버 시작 시 자동 실행된다 (`migrationsRun: true`).

## 주요 명령어

| 명령어 | 설명 |
|---|---|
| `pnpm dev:server` | 서버 개발 모드 실행 |
| `pnpm dev:web` | 웹 개발 모드 실행 |
| `pnpm dev:desktop` | 데스크톱 서비스 실행 |
| `pnpm build` | 전체 빌드 |
| `pnpm lint` | 전체 린트 |
| `pnpm docker:dev` | MySQL 컨테이너 실행 |
| `pnpm docker:dev:down` | MySQL 컨테이너 중지 |
| `pnpm --filter @gritpus-stela/web generate` | API 클라이언트 자동 생성 (서버 실행 필요) |

## 회의록 AI 파싱 아키텍처

회의록 원문에서 액션 아이템을 추출하고, 담당자를 매칭하고, 요약을 생성하는 파이프라인이다.

### 전체 흐름

```mermaid
sequenceDiagram
    participant Client
    participant Controller as MeetingController
    participant Service as MeetingService
    participant SSE as MeetingProgressService
    participant Agent as MeetingAgentService
    participant Resolver as AssigneeResolverService
    participant Summary as MeetingSummaryService
    participant LLM as DesktopLLM (Claude)
    participant DB

    Client->>Controller: POST /meetings/:id/parse
    Controller->>Service: parseAsync(meetingId)
    Service->>DB: status = PARSING
    Service-->>Controller: 202 Accepted
    Controller-->>Client: 즉시 응답

    Client->>Controller: GET /meetings/:id/parse/events (SSE)
    Controller->>SSE: subscribe(meetingId)

    Note over Service: 백그라운드 실행 (fire-and-forget)

    Service->>SSE: emit("started")
    Service->>SSE: emit("analyzing")
    Service->>Agent: parseMinutes(projectId, rawContent)

    loop ReAct Loop (최대 8회, 300s 타임아웃)
        Agent->>SSE: emit("agent_iteration", N/8)
        Agent->>LLM: 프롬프트 + 스크래치패드
        LLM-->>Agent: 응답 (Action 또는 Final Answer)
        opt Tool 호출
            Agent->>SSE: emit("agent_tool", toolName)
            Agent->>Agent: Tool 실행 → Observation 추가
        end
    end

    Agent-->>Service: ParsedMeetingResult (액션 아이템 + 요약)

    Service->>SSE: emit("resolving_assignees")
    Service->>Resolver: resolveWithLlm(actionItems, members)
    Resolver->>LLM: 이름 → UUID 매칭 요청
    LLM-->>Resolver: 매칭 결과
    Resolver->>Resolver: Fuzzy Matcher 보정
    Resolver-->>Service: 매칭된 액션 아이템
    Service->>Service: normalizeActionItemsDueDates()

    Service->>SSE: emit("summarizing")
    Service->>Summary: summarize(title, rawContent, items)
    Summary->>LLM: 8개 섹션 구조화 요약 요청
    LLM-->>Summary: JSON 요약
    Summary-->>Service: 렌더링된 요약 텍스트

    Service->>DB: parsedActionItems, meetingSummary, status = PARSED
    Service->>SSE: emit("completed")
    SSE-->>Client: 실시간 이벤트 스트림
```

### ReAct Agent 그래프

LangGraph 노드/엣지 구조. 커스텀 ReAct 루프로 구현되어 있다.

```mermaid
graph TD
    __start__([__start__]) --> agent

    agent["agent<br/><i>LLM 호출 (DesktopLLM → Claude)</i><br/>프롬프트 + scratchpad → 응답"]
    agent --> should_continue{should_continue}

    should_continue -- "Final Answer 감지" --> parse_output
    should_continue -- "Action 감지" --> tools
    should_continue -- "형식 오류 + JSON 추출 성공" --> parse_output
    should_continue -- "형식 오류 + JSON 없음" --> error_feedback
    should_continue -- "반복 >= 8" --> __error__

    tools["tools<br/><i>StructuredTool 실행</i><br/>Observation → scratchpad 추가"]
    tools --> agent

    error_feedback["error_feedback<br/><i>형식 오류 피드백</i><br/>오류 메시지 → scratchpad 추가"]
    error_feedback --> agent

    parse_output["parse_output<br/><i>JSON 파싱</i><br/>응답 → ParsedMeetingResult"]
    parse_output --> __end__

    __end__([__end__])
    __error__([__error__<br/>최대 반복 초과])

    subgraph tools_available [StructuredTools]
        T1[get_project_members]
        T2[get_boards]
        T3[get_board_details]
        T4[get_cards]
        T5[get_labels]
    end
```

### 파싱 파이프라인 그래프

전체 파싱은 순차 노드 체인으로 구성된다.

```mermaid
graph TD
    __start__([__start__]) --> react_agent

    react_agent["react_agent<br/><i>MeetingAgentService</i><br/>회의록 → 액션 아이템 + 요약 초안 추출"]
    react_agent --> resolve_assignees

    resolve_assignees["resolve_assignees<br/><i>AssigneeResolverService</i><br/>LLM 매칭 → Fuzzy Matcher 보정"]
    resolve_assignees --> normalize_due_dates

    normalize_due_dates["normalize_due_dates<br/><i>dueDateNormalizer</i><br/>상대 날짜 → 절대 날짜 변환"]
    normalize_due_dates --> summarize

    summarize["summarize<br/><i>MeetingSummaryService</i><br/>8개 섹션 구조화 요약 생성"]
    summarize --> save_results

    save_results["save_results<br/><i>DB 저장</i><br/>parsedActionItems + meetingSummary + status=PARSED"]
    save_results --> __end__([__end__])
```

### 타임아웃 설정

| 단계 | 타임아웃 | 실패 시 |
|------|----------|---------|
| Agent 전체 | 300초 | 에러 발생, status = FAILED |
| LLM 호출 (Agent) | 180초 | 에러 전파 |
| 담당자 매칭 LLM | 90초 | Fuzzy Matcher로 폴백 |
| 회의 요약 LLM | 120초 | 기본 요약 텍스트 생성 |
