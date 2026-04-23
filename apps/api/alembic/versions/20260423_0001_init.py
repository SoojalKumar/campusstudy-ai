"""Initial CampusStudy schema."""

from __future__ import annotations

from alembic import op
from sqlalchemy import inspect

from app.db.base import Base
from app.models import *  # noqa: F401,F403

revision = "20260423_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    for table in reversed(Base.metadata.sorted_tables):
        if table.name in existing:
            table.drop(bind=bind)

