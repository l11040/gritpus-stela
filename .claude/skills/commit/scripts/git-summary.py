#!/usr/bin/env python3
"""git 변경사항을 분석하여 scope별로 그룹핑한 요약을 출력한다."""

import subprocess
import sys
from collections import defaultdict


def run(cmd: str) -> str:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()


def get_scope(path: str) -> str:
    """파일 경로에서 scope를 추출한다."""
    if path.startswith("apps/web/"):
        return "web"
    if path.startswith("apps/server/"):
        return "server"
    if path.startswith("apps/desktop/"):
        return "desktop"
    if path.startswith("packages/shared/"):
        return "shared"
    return "root"


def get_change_type(status: str) -> str:
    types = {"M": "modified", "A": "added", "D": "deleted", "R": "renamed", "?": "untracked"}
    return types.get(status[0], status)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    if mode == "staged":
        status_lines = run("git diff --cached --name-status").splitlines()
    else:
        staged = run("git diff --cached --name-status").splitlines()
        unstaged = run("git diff --name-status").splitlines()
        untracked = [f"?\t{f}" for f in run("git ls-files --others --exclude-standard").splitlines() if f]
        status_lines = staged + unstaged + untracked

    if not status_lines:
        print("변경사항 없음")
        return

    groups: dict[str, list[dict]] = defaultdict(list)
    for line in status_lines:
        if not line.strip():
            continue
        parts = line.split("\t", 1)
        if len(parts) < 2:
            continue
        status, path = parts[0].strip(), parts[1].strip()
        scope = get_scope(path)
        rel = path
        for prefix in ("apps/web/", "apps/server/", "apps/desktop/", "packages/shared/"):
            if path.startswith(prefix):
                rel = path[len(prefix):]
                break
        groups[scope].append({"status": get_change_type(status), "path": rel, "full": path})

    recent = run("git log --oneline -5")

    print("=== 변경사항 요약 ===\n")
    for scope in ["server", "web", "desktop", "shared", "root"]:
        if scope not in groups:
            continue
        files = groups[scope]
        print(f"[{scope}] ({len(files)}개 파일)")
        for f in files:
            print(f"  {f['status']:10s} {f['path']}")
        print()

    print(f"=== 최근 커밋 ===\n{recent}\n")

    print("=== 추천 커밋 분할 ===\n")
    for scope in ["server", "web", "desktop", "shared", "root"]:
        if scope not in groups:
            continue
        files = groups[scope]
        paths = " ".join(f['full'] for f in files)
        scope_label = f"({scope})" if scope != "root" else ""
        print(f"그룹: {scope_label}")
        print(f"  파일: {paths}")
        print()


if __name__ == "__main__":
    main()
