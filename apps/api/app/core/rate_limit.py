from collections import deque
from datetime import UTC, datetime, timedelta
from threading import Lock

from fastapi import HTTPException, status

from app.core.config import get_settings


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._lock = Lock()
        self._buckets: dict[str, deque[datetime]] = {}

    def check(self, key: str) -> None:
        settings = get_settings()
        window = timedelta(minutes=1)
        limit = settings.rate_limit_requests_per_minute
        now = datetime.now(UTC)

        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and now - bucket[0] > window:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Try again in a minute.",
                )
            bucket.append(now)


rate_limiter = InMemoryRateLimiter()

