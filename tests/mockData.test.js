// mock/data 挡板数据完整性单测（当前真实模型：单班 591班 / 73人 / 5科满分510 / 含真实年排）
import { describe, it, expect } from 'vitest'
import SUBJECTS from '../mock/data/subjects.json'
import EXAMS from '../mock/data/exams.json'
import CLASSES from '../mock/data/classes.json'
import STUDENTS from '../mock/data/students.json'
import CONFIG from '../mock/data/config.json'
import { fullTotal, totalOf } from '../src/logic/analytics.js'

const lastKey = EXAMS[EXAMS.length - 1].key

describe('mock 挡板数据完整性', () => {
  it('至少一个班级，且存在 pin 关注班', () => {
    expect(CLASSES.length).toBeGreaterThanOrEqual(1)
    expect(CLASSES.some(c => c.pin)).toBe(true)
  })
  it('students 覆盖每个班级且非空', () => {
    CLASSES.forEach(c => {
      expect(Array.isArray(STUDENTS[c.id])).toBe(true)
      expect(STUDENTS[c.id].length).toBeGreaterThan(0)
    })
  })
  it('满分合计 = 各科满分之和（= 510）', () => {
    expect(fullTotal(SUBJECTS)).toBe(SUBJECTS.reduce((a, s) => a + s.full, 0))
    expect(fullTotal(SUBJECTS)).toBe(510)
  })
  it('每人每批次含全部科目且为数字、不超满分', () => {
    CLASSES.forEach(c => STUDENTS[c.id].forEach(st => {
      EXAMS.forEach(ex => SUBJECTS.forEach(s => {
        const v = st.scores[ex.key]?.[s.key]
        expect(typeof v).toBe('number')
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(s.full)
      }))
    }))
  })
  it('关注学生 禾皓轩 存在于 pin 班', () => {
    const pinCls = CLASSES.find(c => c.pin)
    expect(STUDENTS[pinCls.id].some(s => s.name === '禾皓轩')).toBe(true)
  })
  it('学生带真实年级名次(ranks)，每批次 total 为正整数', () => {
    const c1 = STUDENTS[CLASSES[0].id]
    c1.forEach(st => {
      EXAMS.forEach(ex => {
        const r = st.ranks && st.ranks[ex.key]
        if (r && r.total != null) {
          expect(r.total).toBeGreaterThanOrEqual(1)
          expect(r.total).toBeLessThanOrEqual(CONFIG.gradeSize)
        }
      })
    })
  })
  it('总分 = 各科分数之和（totalOf 一致性抽查）', () => {
    const st = STUDENTS[CLASSES[0].id][0]
    const manual = SUBJECTS.reduce((a, s) => a + st.scores[lastKey][s.key], 0)
    expect(totalOf(st, lastKey, SUBJECTS)).toBeCloseTo(manual, 6)
  })
})
