아래 Python 스크립트를 실행하여 현재 git 변경사항 요약을 확인한다.

```
python3 .claude/skills/commit/scripts/git-summary.py
```

출력된 요약을 기반으로 다음 규칙에 따라 커밋을 수행한다.

## 커밋 규칙

- Conventional Commits 형식: `<type>(<scope>): <subject>`
- type: feat, fix, refactor, chore, docs, style, test
- scope: web, server, desktop, shared 또는 생략 (루트/전체)
- subject는 한글, 명령형으로 작성
- 한 커밋에 하나의 논리적 변경만 포함

## 수행 절차

1. `python3 .claude/skills/commit/scripts/git-summary.py` 실행하여 변경사항 확인
2. 추천 그룹을 참고하여 scope별로 논리적 단위를 결정
3. 각 그룹별로:
   - `git add <파일들>` 로 스테이징
   - 변경 내용에 맞는 커밋 메시지 작성
   - `git commit` 실행
4. 모든 커밋 완료 후 `git log --oneline -10` 으로 결과 확인

## 주의사항

- .env, credentials 등 민감 파일은 커밋하지 않는다.
- src/api/ (orval 자동생성) 파일은 포함해도 된다.
- 커밋 메시지 끝에 Co-Authored-By는 붙이지 않는다.
