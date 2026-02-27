from __future__ import annotations

import uuid
from dataclasses import dataclass


@dataclass
class TraceContext:
    trace_id: str
    span_id: str


def create_trace_context(headers: dict[str, str]) -> TraceContext:
    normalized = {k.lower(): v for k, v in headers.items()}
    traceparent = normalized.get("traceparent")
    trace_id = ""
    if traceparent:
        parts = traceparent.split("-")
        if len(parts) >= 4 and len(parts[1]) == 32:
            trace_id = parts[1]

    if not trace_id and normalized.get("x-trace-id"):
        trace_id = normalized["x-trace-id"]

    if not trace_id:
        trace_id = uuid.uuid4().hex

    return TraceContext(trace_id=trace_id, span_id=uuid.uuid4().hex[:16])
