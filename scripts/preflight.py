#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def version_output(command: list[str]) -> str:
    try:
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return "missing"
    output = (completed.stdout or completed.stderr).strip()
    return output.splitlines()[0] if output else "installed"


def first_available(*candidates: list[str]) -> list[str]:
    for candidate in candidates:
        binary = candidate[0]
        if shutil.which(binary) or Path(binary).exists():
            return candidate
    return list(candidates[0])


def main() -> int:
    checks = [
        ("python3.11", ["python3.11", "--version"], "Required for the FastAPI backend."),
        ("node", ["node", "--version"], "Required for Next.js and Expo."),
        ("pnpm", ["pnpm", "--version"], "Required by the monorepo workspace."),
        ("docker", ["docker", "--version"], "Required for the local compose stack."),
        (
            "gh",
            first_available(
                ["gh", "--version"],
                ["/tmp/gh-install/gh_2.89.0_macOS_arm64/bin/gh", "--version"],
            ),
            "Optional, but useful for GitHub publishing.",
        ),
    ]

    print("CampusStudy AI preflight")
    print("========================")

    failures = 0
    for name, command, note in checks:
        status = version_output(command)
        marker = "OK" if status != "missing" else "MISSING"
        if status == "missing":
            failures += 1
        print(f"{marker:8} {name:10} {status}")
        print(f"         {note}")

    print("\nSuggested next steps:")
    print("- Install Python 3.11+ before creating the API virtualenv.")
    print("- Install Node.js 20+ and pnpm 10+ for the web/mobile workspace.")
    print("- Install Docker Desktop if you want the compose stack.")
    print("- Then run: make setup")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
