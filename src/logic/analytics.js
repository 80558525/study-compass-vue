/**
 * src/logic/analytics.js —— 纯计算逻辑（排名 / 年级估算 / 真实经验分布）
 * 无副作用、无框架依赖，便于单测与复用。store 里用 computed 调用。
 */

export function erf(x) {
  const s = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - ((((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x)
  return s * y
}
export function ncdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)) }
export function countGreater(sortedDesc, x) {
  let lo = 0, hi = sortedDesc.length
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedDesc[mid] > x) lo = mid + 1; else hi = mid }
  return lo
}

export function totalOf(st, exKey, subjects) {
  return subjects.reduce((a, s) => a + (st.scores[exKey]?.[s.key] || 0), 0)
}
export function fullTotal(subjects) { return subjects.reduce((a, s) => a + s.full, 0) }
export function pct(st, exKey, s) {
  return st.scores[exKey]?.[s.key] != null ? st.scores[exKey][s.key] / s.full * 100 : 0
}

// 汇总全部班级某批次总分（用于年级正态估算的均值/标准差）
export function pooledTotals(exKey, studentsByClass, subjects) {
  const out = []
  Object.values(studentsByClass).forEach(list => list.forEach(s => out.push(totalOf(s, exKey, subjects))))
  return out
}

/**
 * 计算排名。
 * @param {Object} cfg { exams, subjects, students(当前班), studentsByClass(全部班), real, params }
 * @returns {{RANK,GRADE_RANK,SUBJECT_GRADE_RANK}}
 */
export function buildRanking({ exams, subjects, students, studentsByClass, real, params }) {
  const RANK = {}, GRADE_RANK = {}, SUBJECT_GRADE_RANK = {}
  const gs = params.gradeSize || 2000
  const pool = exKey => {
    const out = []
    Object.values(studentsByClass).forEach(list => list.forEach(s => out.push(totalOf(s, exKey, subjects))))
    return out
  }
  exams.forEach(ex => {
    RANK[ex.key] = {}; GRADE_RANK[ex.key] = {}; SUBJECT_GRADE_RANK[ex.key] = {}
    // 班排：当前班内总分降序
    const clsSorted = [...students].sort((a, b) => totalOf(b, ex.key, subjects) - totalOf(a, ex.key, subjects))
    clsSorted.forEach((st, idx) => { RANK[ex.key][st.id] = idx + 1 })
    const r = real && real.byExam ? real.byExam[ex.key] : null
    if (r) {
      // 真实年级：按导入的全年级逐人分数经验分布（分数→名次）
      students.forEach(st => { GRADE_RANK[ex.key][st.id] = Math.max(1, countGreater(r.total, totalOf(st, ex.key, subjects)) + 1) })
      subjects.forEach(s => {
        SUBJECT_GRADE_RANK[ex.key][s.key] = {}
        const arr = r.subjects[s.key]
        if (arr) students.forEach(st => { SUBJECT_GRADE_RANK[ex.key][s.key][st.id] = Math.max(1, countGreater(arr, st.scores[ex.key]?.[s.key] || 0) + 1) })
      })
    } else {
      // 估算：全部班级汇总分布映射到年级人数
      const pooled = pool(ex.key)
      const mu = pooled.reduce((a, b) => a + b, 0) / (pooled.length || 1)
      const sd = Math.sqrt(pooled.reduce((a, b) => a + (b - mu) ** 2, 0) / (pooled.length || 1)) || 1
      students.forEach(st => {
        const T = totalOf(st, ex.key, subjects)
        const above = 1 - ncdf((T - mu) / sd)
        GRADE_RANK[ex.key][st.id] = Math.max(1, Math.min(gs, Math.round(above * gs) + 1))
      })
    }
    // 真实年排覆盖：成绩单导入的学生带有 st.ranks[examKey]（总分 + 各科真实年级名次），优先采用真实值，
    // 无 ranks 的学生（如重生成/编辑后）自动保留上面的估算基线。
    students.forEach(st => {
      const rr = st.ranks && st.ranks[ex.key]
      if (!rr) return
      if (rr.total != null) GRADE_RANK[ex.key][st.id] = rr.total
      subjects.forEach(s => {
        if (rr[s.key] != null) {
          if (!SUBJECT_GRADE_RANK[ex.key][s.key]) SUBJECT_GRADE_RANK[ex.key][s.key] = {}
          SUBJECT_GRADE_RANK[ex.key][s.key][st.id] = rr[s.key]
        }
      })
    })
  })
  return { RANK, GRADE_RANK, SUBJECT_GRADE_RANK }
}

/**
 * 用「真实年排名次 + 总分」锚点做分段线性插值，还原整个年级的分数分布，
 * 进而估算年级均分与年级及格率。适用于只有单个班级逐人分数、但带有真实年级名次的场景。
 * 中段（锚点覆盖的名次区间）为线性插值，可信度高；两端（最高名次以上、最低名次以下）
 * 按最近一段斜率外推，并夹在 [0, full] 内。
 * @param {Array<{rank:number,total:number}>} anchors 有真实年排的学生锚点
 * @param {number} gradeSize 年级总人数
 * @param {number} full 总满分
 * @param {number} passRatio 及格比例（默认 0.6）
 * @returns {{avg:number,passPct:number,passCount:number,covered:number,minRank:number,maxRank:number}|null}
 */
export function estimateGradeMetrics(anchors, gradeSize, full, passRatio = 0.6) {
  const pts = (anchors || [])
    .filter(a => a && a.rank != null && a.total != null)
    .sort((a, b) => a.rank - b.rank)
  if (!pts.length || !gradeSize || !full) return null
  const passLine = full * passRatio
  const scoreAt = rank => {
    if (pts.length === 1) return Math.min(full, Math.max(0, pts[0].total))
    if (rank <= pts[0].rank) {
      const i = Math.min(1, pts.length - 1)
      const sl = (pts[i].total - pts[0].total) / ((pts[i].rank - pts[0].rank) || 1)
      return Math.min(full, Math.max(0, pts[0].total + sl * (rank - pts[0].rank)))
    }
    if (rank >= pts[pts.length - 1].rank) {
      const i = pts.length - 1
      const sl = (pts[i].total - pts[i - 1].total) / ((pts[i].rank - pts[i - 1].rank) || 1)
      return Math.min(full, Math.max(0, pts[i].total + sl * (rank - pts[i].rank)))
    }
    for (let i = 1; i < pts.length; i++) {
      if (rank <= pts[i].rank) {
        const a = pts[i - 1], b = pts[i]
        return a.total + (b.total - a.total) * (rank - a.rank) / ((b.rank - a.rank) || 1)
      }
    }
    return pts[pts.length - 1].total
  }
  let sum = 0, ge = 0
  for (let rk = 1; rk <= gradeSize; rk++) {
    const sc = scoreAt(rk)
    sum += sc
    if (sc >= passLine) ge++
  }
  return {
    avg: sum / gradeSize,
    passPct: Math.round(ge / gradeSize * 100),
    passCount: ge,
    covered: pts.length,
    minRank: pts[0].rank,
    maxRank: pts[pts.length - 1].rank
  }
}
