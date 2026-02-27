import json
import threading
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app.main import run


_STARTED = False

def _start_server():
    global _STARTED
    if _STARTED:
        return
    thread = threading.Thread(target=run, kwargs={"host": "127.0.0.1", "port": 8765}, daemon=True)
    thread.start()
    time.sleep(0.3)
    _STARTED = True


def test_simulate_and_query_trace():
    _start_server()
    req = Request(
        "http://127.0.0.1:8765/api/commands/simulate",
        data=json.dumps({"vin": "LXYZ1234567890001", "cmd_type": "DOOR_UNLOCK"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-trace-id": "abcd1234abcd1234abcd1234abcd1234"},
        method="POST",
    )
    with urlopen(req) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    assert body["trace_id"] == "abcd1234abcd1234abcd1234abcd1234"
    assert len(body["events"]) == 8

    with urlopen(f"http://127.0.0.1:8765/api/traces/{body['trace_id']}") as resp:
        trace_body = json.loads(resp.read().decode("utf-8"))
    assert len(trace_body["events"]) == 8


def test_dashboard_endpoint():
    _start_server()
    with urlopen("http://127.0.0.1:8765/api/dashboard?minutes=5") as resp:
        body = json.loads(resp.read().decode("utf-8"))
    assert "total" in body
    assert "stage_funnel" in body


def test_trace_not_found():
    _start_server()
    try:
        urlopen("http://127.0.0.1:8765/api/traces/not-exist")
        assert False
    except HTTPError as err:
        assert err.code == 404
