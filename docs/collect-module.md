# 数据采集模块（移植自 dms_collect）

入口：模块导航「数据采集」→ `/#/m/collect`，代码位于 `src/collect/`，外壳为 `src/views/proto/CollectView.vue`（复用平台 `ModuleShell`）。

## 页面（与原数采平台保持一致）
| 分组 | 页面 | 路由 |
| --- | --- | --- |
| 概览 | 数据看板 | `/m/collect/dashboard` |
| 采集 | 采集任务（新建向导、任务抽屉、采集驾驶舱）/ 实时监控 | `tasks` / `monitor` |
| 数据治理 | 处理流水线 / 标注工作台 / 审核工作台 / 数据集管理 | `pipeline` / `annotate` / `review` / `datasets` |
| 资源与系统 | 存储管理 / 设备管理 / 操作审计日志 / 系统管理 | `storage` / `devices` / `logs` / `system` |

侧边栏徽标、Ctrl/⌘+K 全局搜索、通知中心、页面切换骨架屏均保留。

## 与原项目的差异
- 去掉独立登录页、角色切换与退出：沿用训练场平台登录，当前用户取自平台会话。
- 去掉「用户与权限」管理（系统管理仅保留 IP 白名单 / 审计日志 / 系统设置）；`session.can/allowed` 保留接口但恒为有权限。
- 去掉浅色/深色切换，统一为平台深海军蓝 + 青色赛博风（`src/collect/collect.css`，变量同时挂在 `.cl` 与 `html.cl-theme`，弹窗/抽屉同步适配）。
- pinia store id 统一加 `cl-` 前缀，避免与平台 store 冲突。
- 新增依赖：echarts、vue-echarts、three（采集驾驶舱 3D 场景、趋势图）。
