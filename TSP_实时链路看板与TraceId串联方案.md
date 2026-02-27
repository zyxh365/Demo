# TSP 平台实时链路看板与 TraceId 串联方案

## 1. 目标与范围

### 1.1 目标
- **实时监控核心链路健康度**：优先覆盖“远控指令链路”（指令下发、车辆执行、结果回传）。
- **按 TraceId 一键穿透**：从看板异常点直接进入“跨服务调用链 + 结构化日志 + 指标”统一视图。
- **快速定位与闭环**：分钟级发现、定位、止损与复盘。

### 1.2 典型场景
- 指令下发成功率下降（例如 99.9% → 97%）。
- P95/P99 时延突增，链路卡在某个服务或外部依赖。
- 某车型/区域失败率异常高。
- 用户投诉“App 显示已发送但车辆无响应”，需按 traceId 追踪全链路。

---

## 2. 远控指令链路（建议标准化阶段）

建议统一链路阶段（每个阶段都要可观测）：
1. `REQ_ACCEPTED`：API 网关接收请求。
2. `AUTH_CHECKED`：鉴权与风控校验。
3. `CMD_DISPATCHED`：指令写入消息中间件/任务系统。
4. `TBOX_DELIVERED`：TSP 与车端通道投递成功。
5. `VEHICLE_ACK`：车辆已接收（ACK）。
6. `VEHICLE_EXECUTED`：车辆执行完成（成功/失败）。
7. `RESULT_REPORTED`：执行结果回传到平台。
8. `USER_NOTIFIED`：结果推送到 App/消息中心。

> 每个阶段都记录事件时间戳 + traceId + spanId + 业务主键（如 commandId、vin）。

---

## 3. 看板设计（实时大盘 + 诊断钻取）

## 3.1 大盘首页（10 秒~30 秒刷新）

### A. 核心 KPI 卡片
- 指令总量 QPS（1m/5m）。
- 成功率（总体、分车型、分区域）。
- 端到端时延（P50/P95/P99）。
- 超时率、重试率、最终失败率。

### B. 链路漏斗（阶段转化）
- 按 8 个阶段展示到达量与转化率。
- 识别掉点阶段（例如 `CMD_DISPATCHED -> TBOX_DELIVERED` 掉点）。

### C. 异常分布
- TopN 失败码（平台错误码/车端错误码/网络错误码）。
- 失败按车型、固件版本、区域、运营商分布。

### D. 依赖健康
- MQ 积压、消费者延迟。
- 核心 DB 慢查询、连接池占用。
- 三方通道可用性与时延。

## 3.2 钻取页（问题定位）
- 选择时间窗口 + VIN + commandId + traceId。
- 展示：
  - **调用拓扑图**（哪个服务耗时异常）。
  - **Span 时间轴**（每个 span 耗时与状态）。
  - **关联日志流**（同 traceId 自动过滤）。
  - **关键业务字段**（cmdType、vehicleModel、region、errorCode）。

---

## 4. TraceId 串联方案（核心）

## 4.1 TraceId 生成与透传原则
1. **入口统一生成**：在 API Gateway 或 BFF 生成 `traceId`（若客户端已有则校验后沿用）。
2. **全链路透传**：HTTP Header、gRPC Metadata、MQ Message Header 均携带 `traceId`。
3. **禁止丢失与重写**：除跨租户/安全隔离场景外，服务内不应重置 traceId。
4. **日志强制打印**：所有日志模板必须包含 `traceId`、`spanId`、`service`、`env`。

推荐请求头命名：
- 兼容标准：`traceparent`（W3C Trace Context）。
- 业务兜底：`x-trace-id`（便于历史系统快速接入）。

## 4.2 各通信层落地
- **HTTP**：拦截器/Filter 注入 MDC（Mapped Diagnostic Context）。
- **gRPC**：Client/Server Interceptor 自动注入 metadata。
- **MQ/Kafka/RocketMQ**：Producer 写 header，Consumer 读取后放入上下文。
- **异步线程池**：包装 Executor，确保 ThreadLocal/MDC 上下文传递。

## 4.3 日志规范（结构化 JSON）

建议统一字段：
- `timestamp`
- `level`
- `service`
- `env`
- `traceId`
- `spanId`
- `parentSpanId`
- `commandId`
- `vin`
- `cmdType`
- `stage`
- `costMs`
- `result`
- `errorCode`
- `errorMsg`

示例：
```json
{
  "timestamp": "2026-02-26T10:20:30.123+08:00",
  "level": "INFO",
  "service": "tsp-command-dispatcher",
  "env": "prod",
  "traceId": "9f24c8b8aa8c4d2b9b5221f1e71f3ab1",
  "spanId": "c12f9a31e2bb4d1d",
  "commandId": "CMD202602260001",
  "vin": "LXYZ1234567890001",
  "cmdType": "DOOR_UNLOCK",
  "stage": "CMD_DISPATCHED",
  "costMs": 18,
  "result": "SUCCESS"
}
```

## 4.4 指标与 Trace 统一关联
- 指标 label 中增加低基数字段（service、cmdType、region），避免把 `traceId` 放进 metrics label（会导致高基数爆炸）。
- 从告警/指标点跳转到 Trace 查询页时，用时间窗 + 服务 + 错误码缩小范围，再点击具体 traceId。

---

## 5. 推荐技术栈（可演进）

## 5.1 可观测数据面
- **Tracing**：OpenTelemetry SDK + OTel Collector + Jaeger/Tempo。
- **Metrics**：Prometheus + Alertmanager。
- **Logs**：Loki/ELK（Elasticsearch + Logstash + Kibana）。

## 5.2 展示与分析
- **Grafana**：统一看板（指标 + 日志 + Trace 联动）。
- “Explore”中支持 TraceID 直查与 LogQL/Lucene 关联过滤。

## 5.3 告警策略（建议）
- 成功率低于阈值（如 5 分钟 < 98.5%）触发 P1。
- P95 时延超过阈值（如 > 3s）触发 P2。
- 某阶段掉点率异常（环比提升 > 50%）触发异常。
- 单车型失败率显著高于全局（统计检验）触发产品/车端联动告警。

---

## 6. 数据模型建议

## 6.1 事件明细表（用于链路还原）
`command_trace_event`
- `id`
- `trace_id`
- `span_id`
- `parent_span_id`
- `command_id`
- `vin`
- `cmd_type`
- `stage`
- `service`
- `event_time`
- `cost_ms`
- `result`
- `error_code`
- `ext_json`

## 6.2 聚合指标表（用于高性能看板）
`command_kpi_1m`
- `minute_bucket`
- `cmd_type`
- `region`
- `total_cnt`
- `success_cnt`
- `timeout_cnt`
- `p95_ms`
- `p99_ms`

> 明细表用于追踪，聚合表用于秒级看板响应。

---

## 7. 分阶段实施路线图

### Phase 1（2~3 周）：打通可观测基础
- 网关生成/透传 traceId。
- 关键 3~5 个服务接入 OTel。
- 日志结构化并强制输出 traceId。
- 首版远控链路看板上线（成功率、时延、失败码）。

### Phase 2（3~4 周）：完善链路与告警
- 全链路服务覆盖率 > 90%。
- 链路漏斗 + 依赖健康 + 车型维度分析。
- 告警分级、值班与 SOP（标准处置流程）落地。

### Phase 3（持续迭代）：智能诊断
- 异常检测（时序预测/变化点检测）。
- 自动根因候选（服务、区域、版本、依赖）。
- 形成“告警 -> Trace -> 日志 -> 工单”的闭环。

---

## 8. 落地关键点与常见坑

### 8.1 关键点
- 统一上下文字段命名，避免多套 trace 字段并存。
- 先做“核心链路”深度，再逐步扩面。
- 指标维度控制基数，保留可用性。

### 8.2 常见坑
- 仅有日志无 Trace：查问题仍需人工拼接。
- traceId 在 MQ 异步场景丢失：链路断裂。
- 看板指标定义不一致：业务与技术口径冲突。
- 只做展示不做告警：无法真正支撑值班。

---

## 9. 你可以直接使用的最小化交付（MVP）

1. 统一请求头：`traceparent` + `x-trace-id`。
2. 网关、指令服务、车端通道服务接入 OTel。
3. 结构化日志落 ES/Loki，字段包含 traceId。
4. Grafana 看板包含：
   - 成功率趋势
   - P95/P99 时延
   - 阶段漏斗
   - Top 失败码
5. 告警三条：成功率、时延、MQ 积压。

做到以上 5 点，就可以快速具备“发现问题 + traceId 定位问题”的基础能力。
