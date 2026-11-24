# 公网服务器部署指南（GitHub Actions）

与 `dms_collect` 仓库保持完全一致的发布方式：每次推送到 `main` 分支（或在 `Actions` 页面手动点击 `Run workflow`）时，自动执行构建并通过 SSH 将 `dist/` 原子替换到服务器目录。

工作流文件：`.github/workflows/deploy.yml`

---

## 1. 在 GitHub 仓库配置 Secrets

打开 `vinodpall/dms_port` 仓库：**Settings → Secrets and variables → Actions → New repository secret**，直接复用 `dms_collect` 的账号/密钥即可：

| Secret 名称 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DEPLOY_USER` | 是 | 无 | SSH 登录用户名（如 `root`） |
| `DEPLOY_SSH_KEY` | 二选一 | 无 | SSH 私钥全文（推荐） |
| `DEPLOY_PASSWORD` | 二选一 | 无 | SSH 登录密码（未配置私钥时使用） |
| `DEPLOY_HOST` | 否 | `39.185.83.71` | 公网服务器 IP 或域名 |
| `DEPLOY_PORT` | 否 | `22` | SSH 端口 |
| `DEPLOY_PATH` | 否 | `/var/www/dms_port/dist` | 服务器部署目录 |
| `ENV_PRODUCTION` | 否 | 无 | 可选：生产构建环境变量（多行 `.env` 格式，如 `VITE_AMAP_KEY` 等） |

> 未配置 `DEPLOY_USER` 及认证信息时，工作流仅完成构建并跳过上传，不会导致构建报错。

---

## 2. 服务器站点目录

- 默认上传路径为 `/var/www/dms_port/dist`，将 Nginx / 宝塔 / 1Panel 站点根目录指向该目录（或通过 `DEPLOY_PATH` Secret 指定自定义路径）即可。
- 如需在公网使用 **SRS WebRTC 实时视频**，请在 Nginx 中补充 `/rtc-proxy/` 反向代理，详见 [media.md](./media.md)。
