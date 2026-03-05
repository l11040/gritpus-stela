# Server (API) 백엔드 규칙

## NestJS 모듈 구조

Feature 기반 모듈 구조를 따른다. 각 기능은 독립된 모듈로 구성한다.

```
src/
  <module>/
    <module>.module.ts        # 모듈 정의
    <module>.controller.ts    # 엔드포인트 (Service만 호출)
    <module>.service.ts       # 비즈니스 로직
    <module>.dto.ts           # Request/Response DTO
    <module>.swagger.ts       # Swagger 문서 데코레이터
    entities/
      <entity>.entity.ts      # TypeORM 엔티티
  common/
    guards/                   # 인증/권한 가드
    decorators/               # 커스텀 데코레이터
    interceptors/             # 인터셉터
```

## 아키텍처 규칙

### Controller

- Controller는 **요청 수신과 응답 반환만** 담당한다.
- 비즈니스 로직을 포함하지 않는다. Service만 호출한다.
- Swagger 데코레이터는 `*.swagger.ts`로 분리하여 컨트롤러를 깔끔하게 유지한다.

### Service

- Service는 **비즈니스 로직만** 담당한다.
- TypeORM Repository를 직접 주입받아 사용한다.
- 다른 모듈의 Service를 주입받아 사용할 수 있다.

### Entity

- TypeORM 엔티티는 각 모듈의 `entities/` 폴더에 위치한다.
- `autoLoadEntities: true`로 자동 로드한다.
- 개발 환경에서는 `synchronize: true`로 스키마 자동 동기화한다.

### DTO

- 모든 요청/응답에 DTO를 사용한다.
- `class-validator` 데코레이터로 유효성 검사를 정의한다.
- `@ApiProperty()` 데코레이터로 Swagger 문서화한다.

## Swagger 문서 규칙

- 모든 엔드포인트에 Swagger 문서화는 필수다.
- 성공 응답뿐 아니라 에러 응답(`400/401/403/404/409/500`)도 기술한다.
- 문서 데코레이터는 `*.swagger.ts` 파일에 분리한다.

```typescript
// auth.swagger.ts
export function AuthLoginDocs() {
  return applyDecorators(
    ApiOperation({ summary: '로그인' }),
    ApiResponse({ status: 200, type: AuthResponseDto }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

// auth.controller.ts
@AuthLoginDocs()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

## 파일 분리 기준

| 역할 | 위치 | 금지 사항 |
|---|---|---|
| 라우팅/요청 처리 | `*.controller.ts` | 비즈니스 로직 금지 |
| 비즈니스 로직 | `*.service.ts` | HTTP 요청/응답 직접 처리 금지 |
| 데이터 모델 | `entities/*.entity.ts` | 비즈니스 로직 금지 |
| 요청/응답 형식 | `*.dto.ts` | 로직 포함 금지 |
| API 문서 | `*.swagger.ts` | 비즈니스 로직 금지 |
| 권한/인증 | `common/guards/` | 비즈니스 로직 금지 |

## 환경 설정

- `ConfigModule`로 환경 변수를 관리한다.
- 환경별 설정은 `.env.local`, `.env` 파일로 분리한다.
- 하드코딩된 설정값은 금지한다. 반드시 `ConfigService`를 통해 접근한다.

## 테스트 규칙

- Service 단위 테스트를 우선으로 작성한다.
- 테스트 파일은 `*.spec.ts`로 같은 디렉토리에 위치한다.
