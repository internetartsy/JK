"""
Prometheus Metrics for Land Records Backend

Provides custom metrics for OCR processing, review tasks, sync operations,
and system health monitoring.
"""

from prometheus_client import Counter, Histogram, Gauge, Info
from functools import wraps
import time


# ==================== OCR Metrics ====================

ocr_requests_total = Counter(
    'ocr_requests_total',
    'Total OCR requests',
    ['doc_type', 'langs']
)

ocr_requests_failed_total = Counter(
    'ocr_requests_failed_total',
    'Failed OCR requests',
    ['doc_type', 'error_type']
)

ocr_request_duration_seconds = Histogram(
    'ocr_request_duration_seconds',
    'OCR request duration in seconds',
    ['doc_type'],
    buckets=[1, 5, 10, 20, 30, 60, 120, 300]
)

extraction_confidence_score = Gauge(
    'extraction_confidence_score',
    'Last extraction confidence score',
    ['doc_type', 'field']
)

extraction_total = Counter(
    'extraction_total',
    'Total field extractions',
    ['doc_type']
)

extraction_low_confidence_total = Counter(
    'extraction_low_confidence_total',
    'Low confidence extractions requiring review',
    ['doc_type']
)


# ==================== Review Task Metrics ====================

review_tasks_pending_total = Gauge(
    'review_tasks_pending_total',
    'Pending review tasks',
    ['priority']
)

review_tasks_unassigned = Gauge(
    'review_tasks_unassigned',
    'Unassigned review tasks',
    ['priority']
)

review_tasks_completed_total = Counter(
    'review_tasks_completed_total',
    'Completed review tasks',
    ['priority', 'outcome']
)

review_task_duration_seconds = Histogram(
    'review_task_duration_seconds',
    'Time from task creation to completion',
    ['priority'],
    buckets=[60, 300, 900, 1800, 3600, 7200, 86400]
)


# ==================== Sync Metrics ====================

sync_operations_total = Counter(
    'sync_operations_total',
    'Total sync operations',
    ['operation_type', 'entity_type']
)

sync_operations_failed_total = Counter(
    'sync_operations_failed_total',
    'Failed sync operations',
    ['operation_type', 'error_type']
)

sync_queue_pending_items = Gauge(
    'sync_queue_pending_items',
    'Items pending in sync queue'
)

sync_conflicts_total = Counter(
    'sync_conflicts_total',
    'Sync conflicts detected',
    ['entity_type', 'resolution']
)

sync_latency_seconds = Histogram(
    'sync_latency_seconds',
    'Sync operation latency',
    ['operation_type'],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30]
)


# ==================== Database Metrics ====================

db_pool_available_connections = Gauge(
    'db_pool_available_connections',
    'Available database connections in pool'
)

db_pool_in_use_connections = Gauge(
    'db_pool_in_use_connections',
    'In-use database connections'
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['query_type'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
)


# ==================== API Metrics ====================

http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)

active_requests = Gauge(
    'active_requests',
    'Currently active requests'
)


# ==================== App Info ====================

app_info = Info(
    'land_records_app',
    'Application information'
)


# ==================== Decorators ====================

def track_ocr_request(doc_type: str = "unknown"):
    """Decorator to track OCR request metrics"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            ocr_requests_total.labels(
                doc_type=kwargs.get('doc_type', doc_type),
                langs=kwargs.get('langs', 'ur+en')
            ).inc()
            
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                ocr_request_duration_seconds.labels(
                    doc_type=kwargs.get('doc_type', doc_type)
                ).observe(duration)
                return result
            except Exception as e:
                ocr_requests_failed_total.labels(
                    doc_type=kwargs.get('doc_type', doc_type),
                    error_type=type(e).__name__
                ).inc()
                raise
        return wrapper
    return decorator


def track_sync_operation(operation_type: str, entity_type: str = "unknown"):
    """Decorator to track sync operation metrics"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            sync_operations_total.labels(
                operation_type=operation_type,
                entity_type=entity_type
            ).inc()
            
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                sync_latency_seconds.labels(
                    operation_type=operation_type
                ).observe(duration)
                return result
            except Exception as e:
                sync_operations_failed_total.labels(
                    operation_type=operation_type,
                    error_type=type(e).__name__
                ).inc()
                raise
        return wrapper
    return decorator


# ==================== Helper Functions ====================

def record_extraction_confidence(doc_type: str, field_confidences: dict):
    """Record extraction confidence scores for each field"""
    for field, confidence in field_confidences.items():
        extraction_confidence_score.labels(
            doc_type=doc_type,
            field=field
        ).set(confidence)


def record_low_confidence_extraction(doc_type: str):
    """Record a low-confidence extraction requiring review"""
    extraction_low_confidence_total.labels(doc_type=doc_type).inc()


def update_review_task_metrics(pending_by_priority: dict, unassigned_by_priority: dict):
    """Update review task gauge metrics"""
    for priority, count in pending_by_priority.items():
        review_tasks_pending_total.labels(priority=priority).set(count)
    
    for priority, count in unassigned_by_priority.items():
        review_tasks_unassigned.labels(priority=priority).set(count)


def record_review_task_completed(priority: str, outcome: str, duration_seconds: float):
    """Record a completed review task"""
    review_tasks_completed_total.labels(
        priority=priority,
        outcome=outcome
    ).inc()
    
    review_task_duration_seconds.labels(priority=priority).observe(duration_seconds)


def record_sync_conflict(entity_type: str, resolution: str):
    """Record a sync conflict"""
    sync_conflicts_total.labels(
        entity_type=entity_type,
        resolution=resolution
    ).inc()


def update_sync_queue_size(size: int):
    """Update sync queue pending items"""
    sync_queue_pending_items.set(size)


def update_db_pool_stats(available: int, in_use: int):
    """Update database connection pool stats"""
    db_pool_available_connections.set(available)
    db_pool_in_use_connections.set(in_use)
