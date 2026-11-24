# 学情罗盘 · Study Compass（Vue 3 重构版）

班级 / 年级成绩可视化分析网站，关注学生：禾皓轩（初一年级）。

本次由「单文件原生 JS」重构为工程化 **Vue 3** 项目：

- 框架：**Vue 3 + Vite**
- UI 组件库：**Vant 4**（移动端优先，PC 端用居中限宽的响应式外壳适配，移动 / Web 双端）
- 图表：**ECharts + vue-echarts**（从 Chart.js 迁移）
- 状态：**Pinia**
- 请求：**axios + 纯数据挡板**（`mock/` 里只放接口返回的静态 JSON 数据，无任何逻辑，方便直接改数或换真实后端）

## 目录结构

```
study-compass-vue/
├── index.html
├── public/                 # 静态资源：分享缩略图 share.png + icons/（favicon / apple-touch-icon / PWA）
├── vite.config.js          # Vant 按需自动引入 + 双端
├── .env                    # VITE_USE_MOCK / VITE_API_BASE 开关
├── mock/                   ★ 只放接口返回的挡板数据（改数据看这里）
│   ├── index.js            # url → JSON 的纯映射表（无逻辑）
│   ├── README.md           # mock 说明
│   └── data/               # 每个接口一个 JSON 响应体，可直接编辑
│       ├── subjects.json   # 科目 / 满分 / 颜色
│       ├── exams.json      # 考试批次 / 日期
│       ├── classes.json    # 班级（pin:true = 禾皓轩所在班）
│       ├── students.json   # 各班名单 + 逐人逐科成绩（核心数据，120 人）
│       └── config.json     # 年级人数等配置
├── src/
│   ├── main.js
│   ├── App.vue             # 头部 + 班级栏 + Vant Tabs + 视图容器
│   ├── api/
│   │   ├── http.js         # axios 封装，VITE_USE_MOCK=true 时命中挡板 JSON，零网络
│   │   └── grade.js        # 各接口方法 + 并行拉取组装（改接口路径只动这里）
│   ├── demo/genStudents.js # 前端“演示用”随机生成器（编辑器“重新生成”用；非挡板）
│   ├── stores/grade.js     # Pinia：状态 + 派生排名 + 操作 + localStorage 持久化
│   ├── logic/analytics.js  # 纯计算：班排 / 年级正态估算 / 真实经验分布
│   ├── components/         # EChart.vue（图表封装）、ClassBar.vue（班级切换）
│   ├── views/              # Dashboard / Detail / Person / Compare / Editor 五大视图
│   ├── utils/              # exporter.js（Excel/CSV 导出）、realImport.js（真实数据解析）
│   └── styles/theme.css    # 红笔批改·学术手账主题 + Vant 变量覆盖 + 双端响应式
└── scripts/
    ├── seed.mjs            # 一次性造数脚本（分布模型），重新生成 mock/data/*.json
    ├── gen_icons.py        # 生成分享缩略图与图标到 public/（python3 scripts/gen_icons.py）
    └── logic.test.mjs      # 纯逻辑冒烟测试（npm run test:logic）
```

## 运行

```bash
npm install --registry=https://registry.npmmirror.com
npm run dev        # 默认 http://localhost:8080 ，同时打印局域网 IP 供手机访问
npm run build      # 产物在 dist/
npm run preview    # 预览构建产物（同样 8080）
```

手机与电脑同一局域网时，访问终端里打印的 `Network: http://<局域网IP>:8080/` 即可。

## 怎么改数据（重点）

`mock/` 里只有接口返回的**静态 JSON 挡板**，没有一行逻辑代码，**改数据不用碰页面**：

1. 改科目、满分、颜色 → 编辑 `mock/data/subjects.json`。
2. 改考试批次与日期 → 编辑 `mock/data/exams.json`。
3. 改班级（数量 / 名称，`pin:true` 的班为禾皓轩所在班）→ 编辑 `mock/data/classes.json`。
4. 改名单与逐人逐科成绩（核心数据）→ 编辑 `mock/data/students.json`，结构为 `{ "C1": [ { "id","name","gender","scores":{ 批次key:{ 科目key:分数 } } }, … ], "C2":[…], "C3":[…] }`，直接改分数或增删学生即可。
5. 改年级人数等配置 → 编辑 `mock/data/config.json`。

改完保存，刷新页面即生效。

想**快速拿到一批全新的随机数据**（不用手写 JSON），跑一次性造数脚本覆盖 `mock/data/*.json`：

```bash
npm run seed        # 等价 node scripts/seed.mjs（分布模型：能力值+学科偏好+逐次进步+噪声）
```

运行时**临时改参数看效果**：在「数据编辑器」里调整人数 / 中枢 / 离散 / 趋势后点“重新生成”，走的是前端演示生成器 `src/demo/genStudents.js`，只在内存里重算、不写回挡板文件；点“恢复默认”会清本地缓存并重新读取 `mock/data/*.json`。

**导入真实全年级成绩**做经验排名：在「数据编辑器 → ④」上传 CSV / xlsx 或直接粘贴 CSV（列为姓名 + 各科分数），系统按该批次真实分布换算名次；未导入的批次仍用正态估算。

## 对接真实后端

1. 新建 `.env.local`，写：
   ```
   VITE_USE_MOCK=false
   VITE_API_BASE=http://你的后端地址/api
   ```
2. 后端按下表提供 5 个只读接口，返回结构与对应 `mock/data/*.json` 完全一致即可（把挡板 JSON 换成真实响应，页面代码不用改）：

   | 接口路径 | 对应挡板文件 | 返回内容 |
   | --- | --- | --- |
   | `GET /subjects` | `mock/data/subjects.json` | 科目 / 满分 / 颜色 |
   | `GET /exams` | `mock/data/exams.json` | 考试批次 / 日期 |
   | `GET /classes` | `mock/data/classes.json` | 班级（`pin:true` 为禾皓轩所在班） |
   | `GET /students` | `mock/data/students.json` | 各班名单 + 逐人逐科成绩 |
   | `GET /config` | `mock/data/config.json` | 年级人数等配置 |

   首屏由 `src/api/grade.js` 并行拉取以上 5 个接口再组装（组装逻辑在 api 层，不在 mock）。“重新生成”是前端演示工具、不涉及后端；真实全年级排名在编辑器里导入 CSV/xlsx，也无需后端接口。

## 数据与排名逻辑

- 分数模型：能力值 + 学科偏好 + 逐次进步 + 随机噪声，更接近真实分布。
- 班级排名：当前班内总分降序，无并列。
- 年级排名：默认按“全部班级汇总分布”做正态估算映射到年级人数；导入某批次真实数据后，该批次改用真实经验分布（分数→名次），未导入的批次仍估算。

## 微信 / 社交分享图标

`index.html` 已加入 Open Graph（`og:title` / `og:description` / `og:image` 等）与图标标签（`apple-touch-icon`、多尺寸 `favicon`、PWA 图标）。这些图片由 `python3 scripts/gen_icons.py` 按「红笔批改·学术手账」主题生成到 `public/`（分享缩略图 `share.png`、`icons/` 下的各尺寸图标），改样式后重跑该脚本即可。

⚠️ 微信抓取分享缩略图要求「绝对 URL + 公网 HTTPS」。本地 `localhost` / 局域网 IP 分享时，卡片通常只显示标题、不带图（微信服务器抓不到内网图片）。部署到公网域名后，把 `index.html` 里的 `og:url`、`og:image`（以及 `twitter:image`）改成完整地址，例如 `https://你的域名/share.png`，微信/QQ/钉钉的分享卡片才会显示图标。

## 主要假设清单（待你确认）

- 沿用原版科目（语数英各 120、道法/历史/地理/生物各 100、体育 50）、5 个考试批次、3 个班级、关注学生“禾皓轩”固定 1 班、全年级约 2000 人、基础名次约 800 的语境。
- 保留了原版的 localStorage 本地持久化（编辑、选择切换后刷新不丢）；“恢复默认”会清本地缓存并重新读取 `mock/data/*.json` 挡板。
- Vant 为移动端优先，PC 端采用限宽居中的响应式外壳；若你更希望 PC 端用原生桌面表格观感，可再针对 ≥1024px 优化布局密度。
- 生产构建把 echarts/xlsx/vant 打进同一 chunk（约 1.2MB / gzip 417KB），本地工具可接受；如需可再按 `manualChunks` 拆包。
- 端口 8080 原由旧单文件版静态服务占用，本次已切换为本 Vue 工程的 dev/preview 端口；旧静态服务已停止（文件仍在磁盘，可直接打开）。
