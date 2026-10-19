# 具身智能训练场 · 登录与模块入口（演示用，Vue 3 + TypeScript + Ant Design Vue）

只包含两个页面：登录页 `/#/login` 和五大模块选择页 `/#/portal`，用于演示与对接。

```bash
npm install
npm run dev      # http://localhost:5174
npm run build
```

## 演示账号（密码均为 `123456`）
`admin` 系统管理员 / `zhangjie` 采集操作员 / `linyue` 标注员 / `chenjing` 审核员 / `zhaogong` 维护工程师。不同角色可进入的模块不同，无权限的卡片会置灰。

## 配置

复制 `.env.example` 为 `.env` 并编辑（修改后需重启 / 重新打包）：

### 模块地址
留空表示”待接入”，点击会提示：
```
VITE_URL_COLLECT=http://localhost:5173   # 数采管理平台（dms-collect）
VITE_URL_DEVICE=                         # 机器人设备管理
VITE_URL_BIZ=                            # 机器人业务管理
VITE_URL_SIM=                            # 机器人仿真
VITE_URL_SCENE=                          # 场景管理（训练场）
```

### 风格配置
```bash
VITE_DEFAULT_SKIN=classic                # 默认风格：classic | console | alloy | blueprint
VITE_SKIN_SWITCH=true                    # 是否显示左下角的风格切换器（定稿后改为 false）
```
- 点击模块卡片会在新标签页打开；「数据采集」会携带当前角色（`#/login?sso=<角色>`），数采平台免二次登录。其余模块如需同样的免登录，在 `src/constants.ts` 的 `MODULES` 里给对应项加 `sso: true`，并在目标站点实现读取。
- 平台名称与英文名在 `src/constants.ts` 的 `PLATFORM`。登录逻辑在 `src/stores/session.ts`，对接后端时替换 `login()`。
- 免登录携带角色仅为演示；正式环境请改为后端签发、可校验的 token。
