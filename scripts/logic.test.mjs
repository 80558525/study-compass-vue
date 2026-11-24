// 纯逻辑冒烟测试：挡板数据(mock/data/*.json) + 前端演示生成器 + 排名/年级估算
// 期望值全部由数据动态推导，避免写死班级数/人数/满分等过时假设。
import { createRequire } from 'node:module'
import { genStudentsFor, genAllClasses } from '../src/demo/genStudents.js'
import { buildRanking, totalOf, fullTotal, countGreater } from '../src/logic/analytics.js'

const require = createRequire(import.meta.url)
const SUBJECTS_DEF = require('../mock/data/subjects.json')
const EXAMS_DEF = require('../mock/data/exams.json')
const CLASSES_DEF = require('../mock/data/classes.json')
const STUDENTS = require('../mock/data/students.json')
const CONFIG = require('../mock/data/config.json')

const results = []
const assert = (name, cond, extra = '') => results.push([cond ? 'OK ' : 'FAIL', name, extra])

const pinCls = CLASSES_DEF.find(c => c.pin) || CLASSES_DEF[0]
const c1 = STUDENTS[pinCls.id]
const N = c1.length
const lastKey = EXAMS_DEF[EXAMS_DEF.length - 1].key

// —— 挡板数据完整性 ——
assert('至少一个班级', CLASSES_DEF.length >= 1)
assert('存在 pin 关注班', CLASSES_DEF.some(c => c.pin))
assert('students 覆盖每个班级且非空', CLASSES_DEF.every(c => Array.isArray(STUDENTS[c.id]) && STUDENTS[c.id].length > 0))
assert('关注学生 禾皓轩 存在于 pin 班', c1.some(st => st.name === '禾皓轩'))
assert('每人每批次含全部科目分数', c1.every(st => EXAMS_DEF.every(ex => SUBJECTS_DEF.every(s => typeof st.scores[ex.key][s.key] === 'number'))))
assert('分数不超过满分', CLASSES_DEF.every(c => STUDENTS[c.id].every(st => SUBJECTS_DEF.every(s => st.scores[lastKey][s.key] <= s.full))))
assert('满分合计 = 各科之和', fullTotal(SUBJECTS_DEF) === SUBJECTS_DEF.reduce((a, s) => a + s.full, 0))

// —— 排名（估算模式，无真实导入分布；含 st.ranks 真实年排覆盖）——
const params = { count: N, mid: 72, spread: 14, trend: 8, gradeSize: CONFIG.gradeSize }
const studentsByClass = STUDENTS
const clsSorted = [...c1].sort((a, b) => totalOf(b, lastKey, SUBJECTS_DEF) - totalOf(a, lastKey, SUBJECTS_DEF))
const rk = buildRanking({ exams: EXAMS_DEF, subjects: SUBJECTS_DEF, students: c1, studentsByClass, real: { byExam: {} }, params })
assert('班排第1 = 总分最高', rk.RANK[lastKey][clsSorted[0].id] === 1)
assert(`班排连续 1..${N}`, c1.every(st => rk.RANK[lastKey][st.id] >= 1 && rk.RANK[lastKey][st.id] <= N))
assert('班排名次唯一(无并列)', new Set(c1.map(st => rk.RANK[lastKey][st.id])).size === N)
assert('年级名次在 1..gradeSize 内', c1.every(st => rk.GRADE_RANK[lastKey][st.id] >= 1 && rk.GRADE_RANK[lastKey][st.id] <= params.gradeSize))

// —— 真实经验分布分支 + countGreater（用无 ranks 的合成学生，避免真实年排覆盖干扰）——
const synth = [{ id: 'x1', name: '合成', scores: { [lastKey]: Object.fromEntries(SUBJECTS_DEF.map(s => [s.key, Math.round(s.full * 0.7)])) } }]
const fakeReal = { size: 3, total: [600, 500, 400], subjects: { [SUBJECTS_DEF[0].key]: [120, 100, 80] } }
const rkReal = buildRanking({ exams: EXAMS_DEF, subjects: SUBJECTS_DEF, students: synth, studentsByClass: { [pinCls.id]: synth }, real: { byExam: { [lastKey]: fakeReal } }, params })
assert('真实年级名次>=1且<=size+1', synth.every(st => rkReal.GRADE_RANK[lastKey][st.id] >= 1 && rkReal.GRADE_RANK[lastKey][st.id] <= fakeReal.size + 1))
assert('countGreater 降序二分正确', countGreater([5, 3, 3, 1], 3) === 1 && countGreater([5, 3, 3, 1], 6) === 0)

// —— 前端演示生成器 ——
const demoCls = genStudentsFor({ id: 'CX', name: '测试班', pin: true }, { exams: EXAMS_DEF, subjects: SUBJECTS_DEF, params: { count: N, mid: 72, spread: 14, trend: 8, gradeSize: CONFIG.gradeSize } })
assert(`demo 生成器：${N} 人 + 首位禾皓轩`, demoCls.length === N && demoCls[0].name === '禾皓轩' && demoCls[0].gender === '男')
assert('demo 生成器：班级数与入参一致', Object.keys(genAllClasses({ classes: CLASSES_DEF, exams: EXAMS_DEF, subjects: SUBJECTS_DEF, params })).length === CLASSES_DEF.length)

let pass = 0
results.forEach(r => { console.log(`${r[0]} ${r[1]}${r[2] ? ' · ' + r[2] : ''}`); if (r[0] === 'OK ') pass++ })
console.log(`\n${pass}/${results.length} passed`)
process.exit(pass === results.length ? 0 : 1)
