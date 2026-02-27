from __future__ import annotations

import json
import random
import threading
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    from .store import InMemoryTraceStore
    from .trace import create_trace_context
except ImportError:  # pragma: no cover
    from store import InMemoryTraceStore
    from trace import create_trace_context

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

store = InMemoryTraceStore()
_lock = threading.Lock()


class TspHandler(BaseHTTPRequestHandler):
    server_version = "TSPDashboard/0.1"

    def _json_response(self, status: int, body: dict, trace_id: str | None = None) -> None:
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        if trace_id:
            self.send_header("x-trace-id", trace_id)
        self.end_headers()
        self.wfile.write(payload)

    def _serve_index(self) -> None:
        html = (STATIC_DIR / "index.html").read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            return self._serve_index()

        if parsed.path == "/api/dashboard":
            minutes = int(parse_qs(parsed.query).get("minutes", ["5"])[0])
            return self._json_response(HTTPStatus.OK, store.dashboard(minutes=minutes))

        if parsed.path.startswith("/api/traces/"):
            trace_id = parsed.path.rsplit("/", 1)[-1]
            data = store.get_trace(trace_id)
            if not data:
                return self._json_response(HTTPStatus.NOT_FOUND, {"detail": "trace not found"})
            return self._json_response(HTTPStatus.OK, {"trace_id": trace_id, "events": data})

        self._json_response(HTTPStatus.NOT_FOUND, {"detail": "not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/commands/simulate":
            return self._json_response(HTTPStatus.NOT_FOUND, {"detail": "not found"})

        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length else b"{}"
        try:
            req = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            return self._json_response(HTTPStatus.BAD_REQUEST, {"detail": "invalid json"})

        vin = req.get("vin")
        cmd_type = req.get("cmd_type")
        if not vin or not cmd_type:
            return self._json_response(HTTPStatus.BAD_REQUEST, {"detail": "vin and cmd_type are required"})

        trace_context = create_trace_context(dict(self.headers.items()))
        command_id = req.get("command_id") or f"CMD-{uuid.uuid4().hex[:10]}"
        success = random.random() > 0.2

        with _lock:
            flow = store.add_command_flow(
                trace_id=trace_context.trace_id,
                command_id=command_id,
                vin=vin,
                cmd_type=cmd_type,
                success=success,
            )

        return self._json_response(
            HTTPStatus.OK,
            {
                "trace_id": trace_context.trace_id,
                "command_id": command_id,
                "result": flow[-1].result,
                "events": [x.to_dict() for x in flow],
            },
            trace_id=trace_context.trace_id,
        )


def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), TspHandler)
    print(f"TSP dashboard running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
