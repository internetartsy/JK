import redis
import json
import functools
from typing import Optional, Any
from app.core.config import settings

class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )

    def get(self, key: str) -> Optional[Any]:
        value = self.client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        self.client.setex(key, ttl, value)

    def delete(self, key: str):
        self.client.delete(key)

redis_client = RedisClient()

def cache(ttl: int = 3600, key_builder: Optional[callable] = None):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Check if redis is available (fail silently if not, or log)
            try:
                if not redis_client.client.ping():
                     return func(*args, **kwargs)
            except redis.ConnectionError:
                 return func(*args, **kwargs)

            # Build Cache Key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key builder: func_name:arg1:arg2...
                # Note: This is a simple implementation. Complex objects in args might fail or lack determinism.
                # Assuming simple types for now as per use case.
                key_parts = [func.__name__]
                for arg in args:
                    key_parts.append(str(arg))
                for k, v in sorted(kwargs.items()):
                    key_parts.append(f"{k}={v}")
                cache_key = ":".join(key_parts)
            
            # Try Get
            cached_val = redis_client.get(cache_key)
            if cached_val is not None:
                return cached_val
            
            # Call Original
            result = func(*args, **kwargs)
            
            # Set Cache
            # Note: We can't cache objects like DB sessions or Responses easily. 
            # This decorator should be used on data-returning functions, not route handlers returning Response objects directly if possible, or we need to pickle.
            # But the requirement is to "Apply to expensive endpoints".
            # If the endpoint returns a dict (fastapi automatically converts to JSON), we can cache that.
            
            redis_client.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator
