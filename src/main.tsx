import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, Progress, Space, Statistic, Table, Tag, theme } from 'antd';
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

const app = (
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#2f8bff',
        borderRadius: 8,
      },
    }}
  >
    <ProLayout
      title="车联网全链路监控平台"
      layout="mix"
      fixSiderbar
      route={{ routes: menuItems }}
      location={{ pathname: '/overview' }}
      menuItemRender={(item, dom) => <a>{dom}</a>}
      avatarProps={{ title: 'admin' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <ProCard title="云控远控链路概览" className="panel">
          <Space wrap>
            {['APP', '云网关', 'MQTT Broker', '规则引擎', 'Kafka', '车控服务', 'T-Box', '车辆执行'].map((n, i) => (
              <Tag key={n} color={i % 2 ? 'blue' : 'cyan'}>{n}</Tag>
            ))}
          </Space>
        </ProCard>

        <StatisticCard.Group>
          <StatisticCard statistic={{ title: '车辆总数', value: 2560688, prefix: <DashboardOutlined /> }} />
          <StatisticCard statistic={{ title: 'T-Box 在线', value: 128560, prefix: <MonitorOutlined /> }} />
          <StatisticCard statistic={{ title: '指令成功率', value: 99.23, suffix: '%', prefix: <FireOutlined /> }} />
          <StatisticCard statistic={{ title: '今日异常告警', value: 128, valueStyle: { color: '#ff4d4f' } }} />
        </StatisticCard.Group>

        <ProCard split="vertical" gutter={16}>
          <ProCard colSpan="65%" title="服务拓扑（原型1）" className="panel">
            <div className="topoPlaceholder">APP → API网关 → MQTT/Kafka → 车控服务 → T-Box</div>
            <Progress percent={98.6} status="active" />
          </ProCard>
          <ProCard colSpan="35%" title="实时告警" className="panel">
            <ProList
              rowKey="id"
              dataSource={[
                { id: 1, title: 'T-Box 连接超时', level: '严重', time: '10:30:12' },
                { id: 2, title: 'Kafka 消费延迟', level: '告警', time: '10:29:58' },
                { id: 3, title: 'MQTT 重连次数过高', level: '警告', time: '10:29:33' },
              ]}
              showActions="hover"
              metas={{
                title: { dataIndex: 'title' },
                subTitle: {
                  render: (_, r) => <Tag color={r.level === '严重' ? 'red' : 'orange'}>{r.level}</Tag>,
                },
                description: { dataIndex: 'time' },
              }}
            />
          </ProCard>
        </ProCard>

        <ProCard split="vertical" gutter={16}>
          <ProCard colSpan="50%" title="Kafka 监控（原型2）" className="panel">
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
          <ProCard colSpan="50%" title="链路追踪（原型2）" className="panel">
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
