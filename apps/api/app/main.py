from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine
from app.models import *  # noqa: F401,F403

settings = get_settings()
configure_logging()

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get(settings.request_id_header) or str(uuid4())
    request.state.request_id = request_id
    try:
        response = await call_next(request)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"detail": str(exc), "request_id": request_id})
    response.headers[settings.request_id_header] = request_id
    return response


if settings.auto_create_schema:
    Base.metadata.create_all(bind=engine)

app.include_router(api_router, prefix=settings.api_prefix)
