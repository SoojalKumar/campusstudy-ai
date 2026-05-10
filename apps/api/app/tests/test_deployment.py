import os
import sqlite3
import subprocess
import sys

from app import deployment


def test_initialize_database_runs_migrations_then_seed(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(deployment, "run_migrations", lambda: calls.append("migrate"))
    monkeypatch.setattr(deployment, "seed_demo_data", lambda: calls.append("seed"))

    deployment.initialize_database()

    assert calls == ["migrate", "seed"]


def test_seed_script_is_idempotent_for_demo_login_data(tmp_path):
    db_path = tmp_path / "campusstudy.db"
    upload_path = tmp_path / "uploads"
    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{db_path}",
        "FILE_STORAGE_BACKEND": "local",
        "LOCAL_STORAGE_PATH": str(upload_path),
        "LLM_PROVIDER": "mock",
        "ENABLE_MOCK_AI": "true",
    }

    for _ in range(2):
        subprocess.run(
            [sys.executable, "-m", "app.seed.run"],
            check=True,
            cwd=os.getcwd(),
            env=env,
            capture_output=True,
            text=True,
        )

    with sqlite3.connect(db_path) as connection:
        maya_count = connection.execute(
            "SELECT COUNT(*) FROM users WHERE email = ?",
            ("maya@student.pacific.edu",),
        ).fetchone()[0]
        course_count = connection.execute("SELECT COUNT(*) FROM courses").fetchone()[0]

    assert maya_count == 1
    assert course_count >= 5
