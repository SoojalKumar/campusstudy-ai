#!/usr/bin/env python3
from __future__ import annotations

import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]


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


def file_state(path: Path) -> str:
    return "present" if path.exists() else "missing"


def install_hints(missing_required: list[str]) -> list[str]:
    if not missing_required:
        return ["- Tooling looks good. Next run: make setup"]

    system = platform.system()
    if system == "Darwin":
        hints = ["- Install missing tooling with Homebrew:"]
        if "python3.11" in missing_required or "node" in missing_required or "pnpm" in missing_required:
            hints.append("  brew install python@3.11 node pnpm")
        if "docker" in missing_required:
            hints.append("  brew install --cask docker")
        return hints
    if system == "Linux":
        return [
            "- Install Python 3.11+, Node.js 20+, pnpm 10+, and Docker using your distro package manager.",
            "- Then rerun: make preflight",
        ]
    if system == "Windows":
        return [
            "- Install Python 3.11+, Node.js 20+, pnpm 10+, and Docker Desktop.",
            "- Then rerun: make preflight",
        ]
    return ["- Install the missing tools listed above, then rerun: make preflight"]


def main() -> int:
    checks = [
        ("python3.11", ["python3.11", "--version"], "Required for the FastAPI backend.", True),
        ("node", ["node", "--version"], "Required for Next.js and Expo.", True),
        ("pnpm", ["pnpm", "--version"], "Required by the monorepo workspace.", True),
        ("docker", ["docker", "--version"], "Required for the local compose stack.", True),
        (
            "gh",
            first_available(
                ["gh", "--version"],
                ["/tmp/gh-install/gh_2.89.0_macOS_arm64/bin/gh", "--version"],
            ),
            "Optional, but useful for GitHub publishing.",
            False,
        ),
    ]
    file_checks = [
        (".env", ROOT_DIR / ".env", "Created from .env.example for local app configuration."),
        ("api venv", ROOT_DIR / "apps/api/.venv", "Created by make setup or make api-install."),
    ]

    print("CampusStudy AI preflight")
    print("========================")

    failures = 0
    missing_required: list[str] = []
    for name, command, note, required in checks:
        status = version_output(command)
        marker = "OK" if status != "missing" else "MISSING"
        if required and status == "missing":
            failures += 1
            missing_required.append(name)
        print(f"{marker:8} {name:10} {status}")
        print(f"         {note}")

    print("\nProject files:")
    for label, path, note in file_checks:
        state = file_state(path)
        marker = "OK" if state == "present" else "MISSING"
        print(f"{marker:8} {label:10} {state}")
        print(f"         {note}")

    print("\nSuggested next steps:")
    for hint in install_hints(missing_required):
        print(hint)
    if file_state(ROOT_DIR / ".env") == "missing":
        print("- Copy environment defaults: cp .env.example .env")
    if file_state(ROOT_DIR / "apps/api/.venv") == "missing" and not missing_required:
        print("- Create the API virtualenv and install deps: make api-install")
    print("- Finish bootstrap with: make setup")
    print("- GitHub Actions will validate backend tests and web checks on every push.")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
