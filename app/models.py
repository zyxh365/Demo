from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Literal

Stage = Literal[
    "REQ_ACCEPTED",
    "AUTH_CHECKED",
    "CMD_DISPATCHED",
    "TBOX_DELIVERED",
    "VEHICLE_ACK",
    "VEHICLE_EXECUTED",
    "RESULT_REPORTED",
    "USER_NOTIFIED",
]

ALL_STAGES: list[Stage] = [
    "REQ_ACCEPTED",
    "AUTH_CHECKED",
    "CMD_DISPATCHED",
    "TBOX_DELIVERED",
    "VEHICLE_ACK",
    "VEHICLE_EXECUTED",
    "RESULT_REPORTED",
    "USER_NOTIFIED",
]


@dataclass
class CommandTraceEvent:
    trace_id: str
    span_id: str
    parent_span_id: str | None
    command_id: str
    vin: str
    cmd_type: str
    stage: Stage
    service: str
    event_time: datetime
    cost_ms: int
    result: Literal["SUCCESS", "FAIL"]
    error_code: str | None = None

    def to_dict(self) -> dict:
        data = asdict(self)
        data["event_time"] = self.event_time.astimezone(timezone.utc).isoformat()
        return data
