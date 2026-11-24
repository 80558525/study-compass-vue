// src/logic/analytics.js 纯计算逻辑单测
import { describe, it, expect } from 'vitest'
import {
  erf, ncdf, countGreater, totalOf, fullTotal, pct,
  pooledTotals, buildRanking, estimateGradeMetrics
} from '../src/logic/analytics.js'

const subjects = [
  { key: 'chinese', name: '语文', full: 120 },
  { key: 'math', name: '数学', full: 120 },
  { key: 'english', name: '英语', full: 120 },
  { key: 'history', name: '历史', full: 75 },
  { key: 'politics', name: '政治', full: 75 }
]
const exams = [{ key: 'e1', name: '一阶' }, { key: 'e2', name: '期中' }]

const mk = (id, name, e2, ranks) => ({
  id, name, scores: { e2: {
    chinese: e2[0], math: e2[1], english: e2[2], history: e2[3], politics: e2[4]
  } }, ...(ranks ? { ranks: { e2: ranks } } : {})
})

describe('erf / ncdf', () => {
  it('erf(0)=0 且为奇函数', () => {
    expect(erf(0)).toBeCloseTo(0, 6)
    expect(erf(1)).toBeCloseTo(-erf(-1), 6)
  })
  it('ncdf(0)=0.5，且随 z 单调递增', () => {
    expect(ncdf(0)).toBeCloseTo(0.5, 6)
    expect(ncdf(-2)).toBeLessThan(ncdf(0))
    expect(ncdf(0)).toBeLessThan(ncdf(2))
  })
  it('ncdf 接近标准正态 CDF 已知值', () => {
    expect(ncdf(1.96)).toBeCloseTo(0.975, 2)
  })
})

describe('countGreater（降序数组二分统计 >x 个数）', () => {
  it('等于重复值只计严格大于', () => {
    expect(countGreater([5, 3, 3, 1], 3)).toBe(1)
  })
  it('超过最大值返回 0', () => {
    expect(countGreater([5, 3, 3, 1], 6)).toBe(0)
  })
  it('小于最小值返回全部', () => {
    expect(countGreater([5, 3, 3, 1], 0)).toBe(4)
  })
})

describe('totalOf / fullTotal / pct', () => {
  const st = mk('s1', '甲', [100, 110, 90, 60, 50])
  it('totalOf 累加当前批次各科', () => {
    expect(totalOf(st, 'e2', subjects)).toBe(100 + 110 + 90 + 60 + 50)
  })
  it('totalOf 缺失批次返回 0', () => {
    expect(totalOf(st, 'e1', subjects)).toBe(0)
  })
  it('fullTotal = 各科满分之和', () => {
    expect(fullTotal(subjects)).toBe(120 * 3 + 75 * 2)
  })
  it('pct 计算单科得分率', () => {
    expect(pct(st, 'e2', subjects[0])).toBeCloseTo(100 / 120 * 100, 4)
  })
  it('pct 缺失分数返回 0', () => {
    expect(pct(st, 'e1', subjects[0])).toBe(0)
  })
})

describe('pooledTotals', () => {
  it('汇总全部班级某批次总分', () => {
    const byClass = {
      C1: [mk('a', 'A', [100, 100, 100, 50, 50])],
      C2: [mk('b', 'B', [120, 120, 120, 75, 75])]
    }
    const out = pooledTotals('e2', byClass, subjects)
    expect(out).toContain(100 + 100 + 100 + 50 + 50)
    expect(out).toContain(120 + 120 + 120 + 75 + 75)
    expect(out.length).toBe(2)
  })
})

describe('buildRanking —— 估算模式（无真实分布、无 st.ranks）', () => {
  const students = [
    mk('s1', '低', [60, 60, 60, 30, 30]),
    mk('s2', '中', [90, 90, 90, 50, 50]),
    mk('s3', '高', [110, 115, 110, 65, 65])
  ]
  const studentsByClass = { C1: students }
  const res = buildRanking({ exams, subjects, students, studentsByClass, real: { byExam: {} }, params: { gradeSize: 2000 } })

  it('班排：分数最高名次=1，最低=3', () => {
    expect(res.RANK.e2.s3).toBe(1)
    expect(res.RANK.e2.s2).toBe(2)
    expect(res.RANK.e2.s1).toBe(3)
  })
  it('年排在 [1, gradeSize] 内', () => {
    students.forEach(st => {
      expect(res.GRADE_RANK.e2[st.id]).toBeGreaterThanOrEqual(1)
      expect(res.GRADE_RANK.e2[st.id]).toBeLessThanOrEqual(2000)
    })
  })
  it('年排单调：高分者年排 <= 低分者年排', () => {
    expect(res.GRADE_RANK.e2.s3).toBeLessThanOrEqual(res.GRADE_RANK.e2.s2)
    expect(res.GRADE_RANK.e2.s2).toBeLessThanOrEqual(res.GRADE_RANK.e2.s1)
  })
})

describe('buildRanking —— 真实经验分布分支', () => {
  const students = [mk('s1', '甲', [100, 100, 100, 50, 50])] // 总分 400
  const fakeReal = { size: 3, total: [600, 500, 400], subjects: { chinese: [120, 100, 80] } }
  const res = buildRanking({ exams, subjects, students, studentsByClass: { C1: students }, real: { byExam: { e2: fakeReal } }, params: { gradeSize: 2000 } })
  it('年排基于经验分布 countGreater，落在 [1, size+1]', () => {
    // 总分 400，比它高的有 600,500 → 2 个 → 名次 3
    expect(res.GRADE_RANK.e2.s1).toBe(3)
  })
})

describe('buildRanking —— st.ranks 真实年排覆盖', () => {
  const students = [mk('s1', '甲', [100, 100, 100, 50, 50], { total: 888, chinese: 777 })]
  const res = buildRanking({ exams, subjects, students, studentsByClass: { C1: students }, real: { byExam: {} }, params: { gradeSize: 2000 } })
  it('带 st.ranks 时总分年排用真实值', () => {
    expect(res.GRADE_RANK.e2.s1).toBe(888)
  })
  it('带 st.ranks 时单科年排用真实值', () => {
    expect(res.SUBJECT_GRADE_RANK.e2.chinese.s1).toBe(777)
  })
})

describe('estimateGradeMetrics', () => {
  it('锚点为空/参数缺失返回 null', () => {
    expect(estimateGradeMetrics([], 2000, 510)).toBeNull()
    expect(estimateGradeMetrics([{ rank: 1, total: 500 }], 0, 510)).toBeNull()
  })
  it('单锚点：全年级均分≈锚点分，且及格率合理', () => {
    const m = estimateGradeMetrics([{ rank: 1000, total: 420 }], 2000, 510, 0.6)
    expect(m).not.toBeNull()
    expect(m.covered).toBe(1)
    expect(m.avg).toBeGreaterThan(0)
    expect(m.avg).toBeLessThanOrEqual(510)
    expect(m.passPct).toBeGreaterThanOrEqual(0)
    expect(m.passPct).toBeLessThanOrEqual(100)
  })
  it('多锚点线性插值：更高名次对应更高分数 → 及格率高', () => {
    const anchors = [
      { rank: 1, total: 500 },
      { rank: 500, total: 460 },
      { rank: 1000, total: 420 },
      { rank: 1500, total: 360 },
      { rank: 2000, total: 300 }
    ]
    const m = estimateGradeMetrics(anchors, 2000, 510, 0.6) // 及格线 306
    expect(m.minRank).toBe(1)
    expect(m.maxRank).toBe(2000)
    // 306 分界大致落在 rank 1900 附近，多数学生及格
    expect(m.passPct).toBeGreaterThan(80)
    expect(m.avg).toBeGreaterThan(380)
    expect(m.avg).toBeLessThan(440)
  })
})
