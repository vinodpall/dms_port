# 公网服务器部署指南（GitHub Actions + SSH / rsync）

项目每次推送到 `main` 分支（或在 GitHub 仓库 `Actions` 页面手动点击 `Run workflow`）时，会自动执行构建并将静态产物 `dist/` 增量同步至公网服务器的站点目录。

对应工作流文件：`.github/workflows/deploy.yml`

---

## 1. 在公网服务器准备 SSH 免密登录

1. 登录你的公网服务器，生成一对专用于 GitHub Actions 部署的密钥（或在本地生成后上传公钥）：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/dms_deploy -N ""
cat ~/.ssh/dms_deploy.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
```

2. 查看私钥内容（稍后填入 GitHub Secret `SERVER_SSH_KEY`，**请复制完整内容，包含首尾 `-----BEGIN ...-----` 和 `-----END ...-----`**）：

```bash
cat ~/.ssh/dms_deploy
```

---

## 2. 在 GitHub 仓库配置 Secrets

打开 GitHub 仓库页面：**Settings → Secrets and variables → Actions → New repository secret**，依次添加以下 Secret：

| Secret 名称 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- |
| `SERVER_HOST` | 是 | 公网服务器 IP 或域名 | `123.45.67.89` |
| `SERVER_USER` | 是 | SSH 登录用户名 | `root` |
| `SERVER_SSH_KEY` | 是 | 上一步生成的 SSH **私钥**全文 | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SERVER_DEPLOY_PATH` | 是 | 服务器 Nginx / 宝塔 / 1Panel 站点根目录 | `/www/wwwroot/dms.example.com` |
| `SERVER_PORT` | 否 | SSH 端口，不填默认 `22` | `22` |
| `ENV_PRODUCTION` | 否 | 生产构建环境变量（多行 `.env` 格式），用于注入地图 Key 等 | 见下方说明 |

### 可选：`ENV_PRODUCTION` 示例

如果生产环境需要配置高德地图 Key 或各模块外链地址，可将以下内容填入 Secret `ENV_PRODUCTION`（工作流会在 `npm run build` 前写入 `.env.production.local`）：

```env
VITE_AMAP_KEY=你的高德Web端Key
VITE_AMAP_SECURITY=你的高德安全密钥
VITE_URL_COLLECT=
VITE_URL_DEVICE=
VITE_URL_BIZ=
VITE_URL_SIM=
VITE_URL_SCENE=
```

---

## 3. 站点与 Nginx 注意事项

- 本项目路由采用 Hash 模式（`createWebHashHistory`），静态站点无需额外 rewrite 规则即可正常访问；如需兜底可保留 `try_files $uri $uri/ /index.html;`。
- 同步脚本已默认排除 `.well-known/`、`.user.ini`、`.htaccess`，不会误删宝塔 / 1Panel 的 SSL 证书校验目录或防跨站文件。
- 如果在公网环境启用 **SRS WebRTC 实时视频**，请在站点 Nginx 配置中补充 `/rtc-proxy/` 反向代理（详见 [media.md](./media.md)）。
