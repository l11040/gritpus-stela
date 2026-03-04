# Gritpus Stela

회의록 기반 프로젝트 관리 도구. 매주 회의록에서 AI가 액션 플랜을 추출하고, 칸반 보드로 관리한다.

## 구조

```
apps/
  web/      — 프론트엔드 (Next.js, Tailwind CSS, shadcn/ui)        :50001
  server/   — 백엔드 API (NestJS, TypeORM, MySQL)                  :50002
  desktop/  — Claude CLI 래퍼 서비스 (Node.js HTTP)                :50004
packages/
  shared/   — 공유 TypeScript 인터페이스
infra/      — Docker Compose, Traefik, Dockerfile
```

## 폴더 구조 (web)

Feature 기반 구조. 기능 단위로 묶고, 각 feature 안에 components, hooks, types 등을 둔다.

```
src/
  app/              # Next.js App Router (라우팅만)
  components/
    ui/             # shadcn 컴포넌트 (자동 생성)
    common/         # 공통 레이아웃, Header 등
  features/
    <feature>/
      components/
      hooks/
      types.ts
  api/              # orval 자동 생성 API 클라이언트 (수정 금지)
  hooks/            # 전역 커스텀 훅
  lib/              # 유틸리티 (cn 등)
  types/            # 전역 타입
```

## 기술 스택

- **패키지 매니저**: pnpm (workspaces)
- **모노레포 도구**: Turborepo
- **web**: Next.js 15 (App Router, src 디렉토리, TypeScript, Tailwind CSS v4, shadcn/ui)
- **server**: NestJS 11 (TypeScript, TypeORM, MySQL 8.4, Swagger)
- **desktop**: Node.js HTTP 서버 (Claude CLI 래퍼)
- **shared**: TypeScript 인터페이스 패키지

## 명령어

```bash
pnpm dev:server                           # server 실행
pnpm dev:web                              # web 실행
pnpm dev:desktop                          # desktop 실행
pnpm build                                # 전체 빌드
pnpm lint                                 # 전체 린트
pnpm --filter @gritpus-stela/web dev      # 개별 앱 실행
pnpm --filter @gritpus-stela/server dev
pnpm --filter @gritpus-stela/desktop dev
pnpm --filter @gritpus-stela/web generate # API 클라이언트 생성
pnpm docker:dev                           # MySQL만 실행
pnpm docker:local                         # 전체 로컬 스택 실행
```

## 규칙

- 파일명은 케밥 케이스(kebab-case)를 사용한다. (예: `login-form.tsx`, `use-login-form.ts`, `auth-store.ts`)
- `packages/shared`에 공유 타입을 정의하고 앱 간 공유한다.
- web에 shadcn 컴포넌트 추가 시 해당 앱 디렉토리에서 `pnpm dlx shadcn@latest add <component>` 실행.
- `components/ui/` 파일은 직접 수정하지 않는다. 커스텀이 필요하면 `components/common/`에 래퍼 컴포넌트를 만든다.
- UI 기본 컴포넌트(Button, Input, Dialog 등)는 직접 만들지 않고 반드시 shadcn을 통해 추가한다.
- API 클라이언트는 orval로 자동 생성한다. `src/api/` 파일은 직접 수정하지 않는다.
  - web → spec (`http://localhost:50002/api-docs-json`)
  - API 서버가 실행 중인 상태에서 `pnpm generate` 실행.

## API 문서/아키텍처 규칙 (필수)

- Swagger 문서화는 필수다. 새로운 API 엔드포인트는 문서 없이 머지하지 않는다.
- Swagger에는 성공 응답뿐 아니라 상태코드별 에러 응답(`400/401/403/404/409/500`)을 반드시 기술한다.
- Swagger 데코레이터를 컨트롤러에 직접 길게 작성하지 않는다.
  - 엔드포인트 문서는 `*.swagger.ts`로 분리한다.
  - 컨트롤러에는 `@AuthLoginDocs()` 같은 문서 데코레이터만 붙인다.
- API는 Service 패턴을 사용한다.
  - Service: 비즈니스 로직
  - Controller: Service만 호출한다.
- TypeORM 엔티티는 각 모듈의 `entities/` 폴더에 위치한다.
- 개발 환경에서는 `synchronize: true`로 스키마 자동 동기화한다.

## 커밋 규칙

Conventional Commits를 따른다.

```
<type>(<scope>): <subject>
```

### type

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링 (기능 변경 없음)
- `chore`: 빌드, 설정, 의존성 등 코드 외 변경
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `test`: 테스트 추가/수정

### scope

- `web`, `server`, `desktop`, `shared` 또는 생략 (루트/전체 대상)

### 규칙

- subject는 한글로 작성한다.
- 명령형으로 작성한다. ("추가", "수정", "삭제" 등)
- 한 커밋에 하나의 논리적 변경만 포함한다.
- 여러 앱에 걸친 변경은 scope를 생략한다.

### 예시

```
feat(web): 칸반 보드 페이지 추가
fix(server): JWT 토큰 갱신 로직 수정
chore: eslint 설정 업데이트
docs(server): CLAUDE.md 규칙 추가
```
