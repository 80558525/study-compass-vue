/**
 * scripts/seed.mjs —— 一次性造数脚本（开发工具，非运行时）
 *
 * 作用：用「能力值 + 学科偏好 + 逐次进步 + 随机噪声」分布模型，生成一批“看起来真实”的
 *       班级 / 学生 / 成绩静态数据，写入 mock/data/*.json。
 *
 * 之后 mock/ 目录里只有这些 JSON 挡板数据；想换数据有两种方式：
 *   1) 直接编辑 mock/data/*.json（填你孩子的真实名单和分数）
 *   2) 重新运行 `node scripts/seed.mjs` 换一批随机数据
 *
 * 运行时前端不再做任何“生成”，只是把这些 JSON 当接口返回读取。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'mock', 'data')

// ---- 基础配置（想改科目/考试/班级在这里改，或直接编辑生成的 json）----
const SUBJECTS = [
  { key: 'chinese', name: '语文', full: 120, color: '#C0392B' },
  { key: 'math', name: '数学', full: 120, color: '#2E5E8C' },
  { key: 'english', name: '英语', full: 120, color: '#2F7E5B' },
  { key: 'politics', name: '道德与法治', full: 100, color: '#B07A2A' },
  { key: 'history', name: '历史', full: 100, color: '#7A5AA6' },
  { key: 'geo', name: '地理', full: 100, color: '#3A8B8B' },
  { key: 'bio', name: '生物', full: 100, color: '#C76A9E' },
  { key: 'pe', name: '体育', full: 50, color: '#6B7B3A' }
]
const EXAMS = [
  { key: 'e1', name: '一上·第一次月考', date: '2026-09-30' },
  { key: 'e2', name: '一上·期中考试', date: '2026-11-10' },
  { key: 'e3', name: '一上·第二次月考', date: '2026-12-15' },
  { key: 'e4', name: '一上·期末考试', date: '2027-01-20' },
  { key: 'e5', name: '初一下·第一次月考', date: '2027-03-25' }
]
const CLASSES = [
  { id: 'C1', name: '初一（1）班', grade: '初一', pin: true },
  { id: 'C2', name: '初一（2）班', grade: '初一' },
  { id: 'C3', name: '初一（3）班', grade: '初一' }
]
const PARAMS = { count: 40, mid: 72, spread: 14, trend: 8, gradeSize: 2000 }

const PIN_NAME = '禾皓轩'
const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜'.split('')
const GIVEN = ['子涵', '浩然', '一诺', '欣怡', '梓睿', '雨桐', '俊杰', '思远', '嘉懿', '若曦', '晨曦', '子墨', '梓涵', '皓宇', '明轩', '锦程', '若楠', '泽宇', '语嫣', '书瑶', '博文', '天佑', '可欣', '若彤', '晨阳', '嘉树', '知微', '牧遥', '星野']

// ---- 分布模型 ----
const rnd = (a, b) => a + Math.random() * (b - a)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
function gauss(mean, sd) {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
function genStudentsFor(cls) {
  const { count, mid, spread, trend } = PARAMS
  const isPin = !!cls.pin
  const arr = []
  for (let i = 0; i < count; i++) {
    const nm = (i === 0 && isPin)
      ? PIN_NAME
      : SURNAMES[Math.floor(rnd(0, SURNAMES.length))] + GIVEN[Math.floor(rnd(0, GIVEN.length))] + (Math.random() < 0.2 ? GIVEN[Math.floor(rnd(0, GIVEN.length))][0] : '')
    const ability = clamp(gauss(mid / 100, spread / 100 / 2), 0.35, 0.98)
    const bias = {}
    SUBJECTS.forEach(s => { bias[s.key] = gauss(0, 0.05) })
    const scores = {}
    EXAMS.forEach((ex, ei) => {
      scores[ex.key] = {}
      const prog = trend / 100 * (ei / (EXAMS.length - 1 || 1))
      SUBJECTS.forEach(s => {
        const p = clamp(ability + bias[s.key] + prog + gauss(0, 0.04), 0.25, 1)
        scores[ex.key][s.key] = Math.round(p * s.full)
      })
    })
    arr.push({ id: cls.id + 'S' + (1000 + i), name: nm, pin: (i === 0 && isPin), gender: (i === 0 && isPin) ? '男' : (Math.random() < 0.5 ? '男' : '女'), scores })
  }
  return arr
}

// ---- 写文件 ----
fs.mkdirSync(OUT, { recursive: true })
const studentsByClass = {}
CLASSES.forEach(c => { studentsByClass[c.id] = genStudentsFor(c) })

const write = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2))
write('subjects.json', SUBJECTS)
write('exams.json', EXAMS)
write('classes.json', CLASSES)
write('students.json', studentsByClass)
write('config.json', { gradeSize: PARAMS.gradeSize, note: '年级人数用于估算年级名次；导入真实年级数据后以真实分布为准' })

const total = Object.values(studentsByClass).reduce((a, l) => a + l.length, 0)
console.log(`seeded -> ${OUT}`)
console.log(`  ${CLASSES.length} 个班级 / ${total} 名学生 / ${EXAMS.length} 批次 / ${SUBJECTS.length} 科目`)
console.log(`  C1 第一名 = ${studentsByClass.C1[0].name}（关注学生）`)
