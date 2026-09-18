from redis import Redis

from .config import settings

ANALYSIS_QUEUE = "debugging-app:analysis"


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def enqueue_analysis(run_id: int) -> None:
    client = get_redis()
    client.rpush(ANALYSIS_QUEUE, str(run_id))
    client.close()


def dequeue_analysis(timeout: int = 5) -> int | None:
    client = get_redis()
    try:
        item = client.blpop(ANALYSIS_QUEUE, timeout=timeout)
        return int(item[1]) if item else None
    finally:
        client.close()
