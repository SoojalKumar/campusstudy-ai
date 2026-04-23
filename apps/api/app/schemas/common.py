from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CamelModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampsMixin(CamelModel):
    id: str
    created_at: datetime
    updated_at: datetime

