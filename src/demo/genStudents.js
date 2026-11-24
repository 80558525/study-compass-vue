/**
 * src/demo/genStudents.js —— 前端“演示用”随机生成器（不属于 mock 挡板）
 *
 * 用途：编辑器里拖动「学生人数 / 中枢 / 离散 / 趋势」后点“重新生成一批演示数据”时，
 *       在浏览器本地按分布模型即时造数，方便你快速看不同参数下的图表效果。
 * 注意：真实数据请改 mock/data/*.json 或接后端；这里只是纯前端演示工具。
 */
const rnd = (a, b) => a + Math.random() * (b - a)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
function gauss(mean, sd) {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜'.split('')
const GIVEN = ['子涵', '浩然', '一诺', '欣怡', '梓睿', '雨桐', '俊杰', '思远', '嘉懿', '若曦', '晨曦', '子墨', '梓涵', '皓宇', '明轩', '锦程', '若楠', '泽宇', '语嫣', '书瑶', '博文', '天佑', '可欣', '若彤', '晨阳', '嘉树', '知微', '牧遥', '星野']
const PIN_NAME = '禾皓轩'

export function genStudentsFor(cls, { exams, subjects, params }) {
  const { count = 40, mid = 72, spread = 14, trend = 8 } = params
  const isPin = !!cls.pin
  const arr = []
  for (let i = 0; i < count; i++) {
    const nm = (i === 0 && isPin)
      ? PIN_NAME
      : SURNAMES[Math.floor(rnd(0, SURNAMES.length))] + GIVEN[Math.floor(rnd(0, GIVEN.length))] + (Math.random() < 0.2 ? GIVEN[Math.floor(rnd(0, GIVEN.length))][0] : '')
    const ability = clamp(gauss(mid / 100, spread / 100 / 2), 0.35, 0.98)
    const bias = {}
    subjects.forEach(s => { bias[s.key] = gauss(0, 0.05) })
    const scores = {}
    exams.forEach((ex, ei) => {
      scores[ex.key] = {}
      const prog = trend / 100 * (ei / (exams.length - 1 || 1))
      subjects.forEach(s => {
        const p = clamp(ability + bias[s.key] + prog + gauss(0, 0.04), 0.25, 1)
        scores[ex.key][s.key] = Math.round(p * s.full)
      })
    })
    arr.push({ id: cls.id + 'S' + (1000 + i), name: nm, pin: (i === 0 && isPin), gender: (i === 0 && isPin) ? '男' : (Math.random() < 0.5 ? '男' : '女'), scores })
  }
  return arr
}

export function genAllClasses({ classes, exams, subjects, params }) {
  const out = {}
  classes.forEach(cls => { out[cls.id] = genStudentsFor(cls, { exams, subjects, params }) })
  return out
}
