from slowapi import Limiter
from starlette.requests import Request


def _safe_get_remote_address(request: Request) -> str:
    """
    Safely extract the client IP, handling reverse-proxy scenarios (e.g. Render)
    where request.client may be None.
    """
    # 1. Prefer X-Forwarded-For (set by the reverse proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    # 2. Fall back to request.client.host
    if request.client and request.client.host:
        return request.client.host

    # 3. Final fallback
    return "unknown"


limiter = Limiter(key_func=_safe_get_remote_address)
