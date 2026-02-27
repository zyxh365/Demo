# TSP 实时链路看板（MVP 代码版）

最小可运行实现：
- 模拟远控指令链路 8 个阶段事件。
- 支持 `traceId` 透传（`traceparent`/`x-trace-id`）。
- 提供实时指标看板与 trace 查询。

## 启动

```bash
python app/main.py
```

访问：`http://localhost:8000`

## API

- `POST /api/commands/simulate`
  - Body: `{"vin":"LXYZ1234567890001","cmd_type":"DOOR_UNLOCK"}`
- `GET /api/dashboard?minutes=5`
- `GET /api/traces/{trace_id}`

## 测试

```bash
pytest -q
```
