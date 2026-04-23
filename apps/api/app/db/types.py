import json
from typing import Any

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


class EmbeddingType(sa.TypeDecorator[list[float]]):
    impl = sa.JSON
    cache_ok = True

    def __init__(self, dimensions: int) -> None:
        super().__init__()
        self.dimensions = dimensions

    def load_dialect_impl(self, dialect: sa.Dialect) -> sa.TypeEngine[Any]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(self.dimensions))
        return dialect.type_descriptor(sa.JSON())

    def process_bind_param(self, value: list[float] | None, dialect: sa.Dialect) -> Any:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value: Any, dialect: sa.Dialect) -> list[float] | None:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return list(value)
        if isinstance(value, str):
            return json.loads(value)
        return list(value)

