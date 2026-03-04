# Web 프론트엔드 규칙

## 단일 책임 원칙 (SRP)

하나의 파일, 하나의 함수, 하나의 컴포넌트는 반드시 **하나의 역할만** 수행한다.

### 컴포넌트

- 컴포넌트는 **UI 렌더링만** 담당한다. 비즈니스 로직을 포함하지 않는다.
- 데이터 페칭, 상태 변환, 유효성 검사 등의 로직은 반드시 **커스텀 훅으로 분리**한다.
- 하나의 컴포넌트 파일에 여러 컴포넌트를 정의하지 않는다.

```
# 금지: 컴포넌트 안에 로직 혼합
function BoardCard({ id }) {
  const [card, setCard] = useState(null);
  useEffect(() => { fetch(`/api/cards/${id}`)... }, []);  // ❌
  const isOverdue = card?.dueDate < new Date();            // ❌
  return <div>...</div>;
}

# 올바른 패턴: 로직을 훅으로 분리
function BoardCard({ id }) {
  const { card, isOverdue } = useCard(id);  // ✅
  return <div>...</div>;
}
```

### 훅 (Hooks)

- 하나의 훅은 **하나의 관심사만** 처리한다.
- API 호출 훅과 UI 상태 훅을 분리한다.
- feature 내부의 훅은 `features/<feature>/hooks/`에 위치한다.
- 여러 feature에서 사용하는 훅만 `src/hooks/`에 위치한다.

### 페이지 (app/)

- `app/` 디렉토리의 파일은 **라우팅과 레이아웃만** 담당한다.
- 페이지 컴포넌트는 feature 컴포넌트를 조합만 하고, 직접적인 로직을 포함하지 않는다.

## 파일 분리 기준

| 역할 | 위치 | 금지 사항 |
|---|---|---|
| UI 렌더링 | `components/` | 데이터 페칭, 비즈니스 로직 금지 |
| 비즈니스 로직 | `hooks/` | JSX 반환 금지 |
| 타입 정의 | `types.ts` | 로직 포함 금지 |
| API 클라이언트 | `api/` (자동 생성) | 수동 수정 금지 |
| 유틸리티 함수 | `lib/` | 상태, 사이드이펙트 금지 |

## 컴포넌트 규칙

- shadcn `components/ui/` 파일은 직접 수정하지 않는다.
- 커스텀이 필요하면 `components/common/`에 래퍼 컴포넌트를 만든다.
- UI 기본 컴포넌트(Button, Input, Dialog 등)는 직접 만들지 않고 shadcn으로 추가한다.
- 아이콘은 lucide-react를 사용한다. 별도의 아이콘 라이브러리를 추가하지 않는다.

## API 클라이언트 규칙

- `src/api/` 파일은 orval이 자동 생성한다. 절대 수동 수정하지 않는다.
- API 호출은 생성된 클라이언트 함수를 통해서만 한다.
- API 서버가 실행 중인 상태에서 `pnpm generate` 실행.
