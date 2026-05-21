import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, Space, Table, Tag, theme } from 'antd';
import {
  ProCard,
  ProLayout,
  ProList,
  ProTable,
  StatisticCard,
} from '@ant-design/pro-components';
import {
  ApartmentOutlined,
  AlertOutlined,
  ApiOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  FireOutlined,
  GatewayOutlined,
  MonitorOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import './styles.css';

type TopoNode = { id: string; label: string; x: number; y: number; ip?: string; cost?: string };
type TopoEdge = { from: string; to: string; color?: string; label?: string };

const menuItems = [
  { path: '/overview', name: '总览驾驶舱', icon: <DashboardOutlined /> },
  { path: '/topology', name: '云控链路', icon: <ApartmentOutlined /> },
  { path: '/service', name: '服务拓扑', icon: <DeploymentUnitOutlined /> },
  { path: '/trace', name: '链路追踪', icon: <RadarChartOutlined /> },
  { path: '/kafka', name: 'Kafka 监控', icon: <ApiOutlined /> },
  { path: '/mqtt', name: 'MQTT 监控', icon: <CloudServerOutlined /> },
  { path: '/device', name: '设备管理', icon: <GatewayOutlined /> },
  { path: '/alarm', name: '告警中心', icon: <AlertOutlined /> },
];

const chainNodes: TopoNode[] = [
  { id: 'app', label: 'APP', x: 70, y: 76, ip: '10.0.0.123', cost: '120ms' },
  { id: 'gateway', label: '云网关', x: 210, y: 76, ip: '10.0.1.243', cost: '35ms' },
  { id: 'mqtt', label: 'MQTT Broker', x: 350, y: 76, ip: '10.0.1.278', cost: '12ms' },
  { id: 'rule', label: '规则引擎', x: 490, y: 76, ip: '10.0.1.290', cost: '45ms' },
  { id: 'kafka', label: 'Kafka', x: 630, y: 76, ip: '10.0.1.335', cost: '98ms' },
  { id: 'ctrl', label: '车控服务', x: 770, y: 76, ip: '10.0.1.433', cost: '210ms' },
  { id: 'tbox', label: 'T-Box', x: 910, y: 76, ip: '10.0.1.643', cost: '420ms' },
  { id: 'ecu', label: '车辆执行', x: 1050, y: 76, ip: '10.0.2.063', cost: '100ms' },
];

const chainEdges: TopoEdge[] = chainNodes.slice(0, -1).map((n, i) => ({
  from: n.id,
  to: chainNodes[i + 1].id,
  color: i < 4 ? '#4ea1ff' : '#46dfac',
}));

const serviceNodes: TopoNode[] = [
  { id: 'app', label: 'APP', x: 70, y: 160 },
  { id: 'api', label: 'API 网关', x: 210, y: 160 },
  { id: 'auth', label: '认证服务', x: 360, y: 80 },
  { id: 'device', label: '车端服务', x: 360, y: 160 },
  { id: 'rule', label: '规则引擎', x: 360, y: 240 },
  { id: 'mqtt', label: 'MQTT Broker', x: 520, y: 80 },
  { id: 'kafka', label: 'Kafka 集群', x: 520, y: 160 },
  { id: 'redis', label: '时序库', x: 520, y: 240 },
  { id: 'ctrl', label: '远控服务', x: 700, y: 160 },
  { id: 'tbox', label: '车端执行', x: 860, y: 160 },
];

const serviceEdges: TopoEdge[] = [
  { from: 'app', to: 'api', label: '2.5k tps' },
  { from: 'api', to: 'auth' },
  { from: 'api', to: 'device' },
  { from: 'api', to: 'rule' },
  { from: 'auth', to: 'kafka' },
  { from: 'device', to: 'kafka', label: '8.5k tps' },
  { from: 'rule', to: 'redis' },
  { from: 'rule', to: 'mqtt' },
  { from: 'mqtt', to: 'ctrl' },
  { from: 'kafka', to: 'ctrl' },
  { from: 'redis', to: 'ctrl' },
  { from: 'ctrl', to: 'tbox' },
];

const nodeById = (nodes: TopoNode[], id: string) => nodes.find((n) => n.id === id)!;

function TopologySvg({ nodes, edges, height, wide = false }: { nodes: TopoNode[]; edges: TopoEdge[]; height: number; wide?: boolean }) {
  const width = wide ? 1140 : 960;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="topologySvg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#62a8ff" />
        </marker>
      </defs>
      {edges.map((e) => {
        const from = nodeById(nodes, e.from);
        const to = nodeById(nodes, e.to);
        return (
          <g key={`${e.from}-${e.to}`}>
            <line
              x1={from.x + 45}
              y1={from.y + 26}
              x2={to.x - 10}
              y2={to.y + 26}
              stroke={e.color ?? '#62a8ff'}
              strokeWidth="2"
              markerEnd="url(#arrow)"
              opacity="0.9"
            />
            {e.label ? <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} className="edgeLabel">{e.label}</text> : null}
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} rx={8} ry={8} width="90" height="52" className="topoNode" />
          <text x={n.x + 45} y={n.y + 22} textAnchor="middle" className="nodeTitle">{n.label}</text>
          {n.ip ? <text x={n.x + 45} y={n.y + 36} textAnchor="middle" className="nodeMeta">{n.ip}</text> : null}
          {n.cost ? <text x={n.x + 45} y={n.y + 48} textAnchor="middle" className="nodeMeta">耗时 {n.cost}</text> : null}
        </g>
      ))}
    </svg>
  );
}

const app = (
  <ConfigProvider
    theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#2f8bff', borderRadius: 8 } }}
  >
    <ProLayout
      title="车联网全链路监控平台"
      layout="mix"
      fixSiderbar
      route={{ routes: menuItems }}
      location={{ pathname: '/overview' }}
      menuItemRender={(_, dom) => <a>{dom}</a>}
      avatarProps={{ title: 'admin' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <ProCard title="全链路拓扑总览（原型1）" className="panel">
          <TopologySvg nodes={chainNodes} edges={chainEdges} height={210} wide />
        </ProCard>

        <StatisticCard.Group>
          <StatisticCard statistic={{ title: '车辆总数', value: 2560688, prefix: <DashboardOutlined /> }} />
          <StatisticCard statistic={{ title: 'T-Box 在线', value: 128560, prefix: <MonitorOutlined /> }} />
          <StatisticCard statistic={{ title: '指令成功率', value: 99.23, suffix: '%', prefix: <FireOutlined /> }} />
          <StatisticCard statistic={{ title: '今日异常告警', value: 128, valueStyle: { color: '#ff4d4f' } }} />
        </StatisticCard.Group>

        <ProCard split="vertical" gutter={16}>
          <ProCard colSpan="65%" title="服务拓扑（原型2）" className="panel">
            <TopologySvg nodes={serviceNodes} edges={serviceEdges} height={340} />
          </ProCard>
          <ProCard colSpan="35%" title="实时告警" className="panel">
            <ProList
              rowKey="id"
              dataSource={[
                { id: 1, title: 'T-Box 连接超时', level: '严重', time: '10:30:12' },
                { id: 2, title: 'Kafka 消费延迟', level: '告警', time: '10:29:58' },
                { id: 3, title: 'MQTT 重连次数过高', level: '警告', time: '10:29:33' },
              ]}
              metas={{
                title: { dataIndex: 'title' },
                subTitle: { render: (_, r) => <Tag color={r.level === '严重' ? 'red' : 'orange'}>{r.level}</Tag> },
                description: { dataIndex: 'time' },
              }}
            />
          </ProCard>
        </ProCard>

        <ProCard split="vertical" gutter={16}>
          <ProCard colSpan="50%" title="Kafka 监控" className="panel">
            <Table
              size="small"
              pagination={false}
              dataSource={[
                { key: '1', topic: 'telemetry', tps: 2450, lag: 32 },
                { key: '2', topic: 'command', tps: 1200, lag: 5 },
                { key: '3', topic: 'event', tps: 980, lag: 12 },
              ]}
              columns={[
                { title: 'Topic', dataIndex: 'topic' },
                { title: '写入 TPS', dataIndex: 'tps' },
                { title: '消费延迟', dataIndex: 'lag' },
              ]}
            />
          </ProCard>
          <ProCard colSpan="50%" title="链路追踪" className="panel">
            <ProTable
              search={false}
              options={false}
              pagination={false}
              rowKey="span"
              dataSource={[
                { span: 'remote-control-service', cost: '2.34s', status: '成功' },
                { span: 'rule-engine-topic', cost: '870ms', status: '成功' },
                { span: 'mqtt-broker', cost: '120ms', status: '成功' },
              ]}
              columns={[
                { title: 'Span', dataIndex: 'span' },
                { title: '耗时', dataIndex: 'cost' },
                { title: '状态', dataIndex: 'status', render: () => <Tag color="success">成功</Tag> },
              ]}
            />
          </ProCard>
        </ProCard>
      </Space>
    </ProLayout>
  </ConfigProvider>
);

ReactDOM.createRoot(document.getElementById('root')!).render(app);
