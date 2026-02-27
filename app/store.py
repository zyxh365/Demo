from __future__ import annotations

import random
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

try:
    from .models import ALL_STAGES, CommandTraceEvent
except ImportError:  # pragma: no cover
    from models import ALL_STAGES, CommandTraceEvent


class InMemoryTraceStore:
    def __init__(self) -> None:
        self.events: list[CommandTraceEvent] = []

    def add_event(self, event: CommandTraceEvent) -> None:
        self.events.append(event)

    def add_command_flow(
        self,
        trace_id: str,
        command_id: str,
        vin: str,
        cmd_type: str,
        success: bool,
    ) -> list[CommandTraceEvent]:
        now = datetime.now(timezone.utc)
        generated: list[CommandTraceEvent] = []
        parent_span_id: str | None = None
        service_map = {
            "REQ_ACCEPTED": "tsp-gateway",
            "AUTH_CHECKED": "tsp-auth",
            "CMD_DISPATCHED": "tsp-dispatcher",
            "TBOX_DELIVERED": "tsp-channel",
            "VEHICLE_ACK": "vehicle-adapter",
            "VEHICLE_EXECUTED": "vehicle-adapter",
            "RESULT_REPORTED": "tsp-result",
            "USER_NOTIFIED": "tsp-notify",
        }

        for index, stage in enumerate(ALL_STAGES):
            span_id = uuid.uuid4().hex[:16]
            result = "SUCCESS"
            error_code = None
            if not success and stage in {"VEHICLE_EXECUTED", "RESULT_REPORTED", "USER_NOTIFIED"}:
                result = "FAIL"
                error_code = "VEHICLE_TIMEOUT"
            event = CommandTraceEvent(
                trace_id=trace_id,
                span_id=span_id,
                parent_span_id=parent_span_id,
                command_id=command_id,
                vin=vin,
                cmd_type=cmd_type,
                stage=stage,
                service=service_map[stage],
                event_time=now + timedelta(milliseconds=index * random.randint(30, 120)),
                cost_ms=random.randint(20, 350),
                result=result,
                error_code=error_code,
            )
            self.add_event(event)
            generated.append(event)
            parent_span_id = span_id
        return generated

    def get_trace(self, trace_id: str) -> list[dict]:
        rows = [e for e in self.events if e.trace_id == trace_id]
        rows.sort(key=lambda x: x.event_time)
        return [row.to_dict() for row in rows]

    def dashboard(self, minutes: int = 5) -> dict:
        window_start = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        rows = [e for e in self.events if e.event_time >= window_start and e.stage == "USER_NOTIFIED"]
        total = len(rows)
        success = sum(1 for e in rows if e.result == "SUCCESS")
        timeout = sum(1 for e in rows if e.error_code == "VEHICLE_TIMEOUT")
        p95 = self._percentile([e.cost_ms for e in rows], 95)
        p99 = self._percentile([e.cost_ms for e in rows], 99)

        stage_count: dict[str, int] = defaultdict(int)
        for event in [e for e in self.events if e.event_time >= window_start]:
            stage_count[event.stage] += 1

        fail_codes: dict[str, int] = defaultdict(int)
        for e in rows:
            if e.error_code:
                fail_codes[e.error_code] += 1

        return {
            "window_minutes": minutes,
            "total": total,
            "success_rate": round((success / total) * 100, 2) if total else 100.0,
            "timeout_rate": round((timeout / total) * 100, 2) if total else 0.0,
            "p95_ms": p95,
            "p99_ms": p99,
            "stage_funnel": [{"stage": s, "count": stage_count.get(s, 0)} for s in ALL_STAGES],
            "top_fail_codes": sorted(
                [{"error_code": code, "count": cnt} for code, cnt in fail_codes.items()],
                key=lambda x: x["count"],
                reverse=True,
            )[:5],
        }

    @staticmethod
    def _percentile(values: list[int], p: int) -> int:
        if not values:
            return 0
        values = sorted(values)
        idx = int(round((p / 100) * (len(values) - 1)))
        return values[idx]
