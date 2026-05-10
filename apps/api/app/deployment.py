from __future__ import annotations

from alembic import command
from alembic.config import Config

from app.seed.run import main as seed_demo_data


def run_migrations() -> None:
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


def initialize_database() -> None:
    run_migrations()
    seed_demo_data()


if __name__ == "__main__":
    initialize_database()
