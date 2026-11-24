# mock/ —— 接口挡板数据（纯数据，无逻辑）

本目录只放**接口返回的挡板数据**，每个 JSON 就是某个接口 `GET` 到的响应体，你可以直接改数值，或换成孩子的真实导出。运行时前端只读取这里的数据，不做任何生成。

## 文件与接口对应

| 文件 | 接口 url | 含义 |
|------|----------|------|
| `data/subjects.json` | `/subjects` | 科目、满分、颜色 |
| `data/exams.json` | `/exams` | 考试批次、日期 |
| `data/classes.json` | `/classes` | 班级（`pin:true` 为关注学生禾皓轩所在班） |
| `data/students.json` | `/students` | 各班学生名单 + 逐人逐科成绩（核心数据） |
| `data/config.json` | `/config` | 年级人数等全局配置 |

`index.js` 只有一张 `url → JSON` 的映射表，不含逻辑。

## 怎么改数据

- 改名字 / 分数 / 满分 / 班级：直接编辑对应 `data/*.json`，刷新页面即生效。
- `students.json` 结构：`{ "C1": [ { "id", "name", "gender", "pin", "scores": { "e1": { "chinese": 93, ... }, "e2": {...} } }, ... ], "C2": [...], "C3": [...] }`，科目 key 见 `subjects.json`，批次 key 见 `exams.json`。

## 想一键换一批随机演示数据

分布模型放在**造数脚本**（不是本目录）：`node scripts/seed.mjs`，它会重新生成上面这些 JSON。

## 接真实后端

`.env` 里 `VITE_USE_MOCK=false` + `VITE_API_BASE=你的地址` 后，这些挡板不再被使用，请求走真实接口；后端按同名 url 返回相同结构的 JSON 即可。
