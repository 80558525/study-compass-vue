// src/stores/grade.js —— 登录与关注学生逻辑单测
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGradeStore } from '../src/stores/grade'

function seed(store) {
  store.studentsByClass.C1 = [
    { id: '1', name: '禾皓轩', scores: { e2: { chinese: 100 } } },
    { id: '2', name: '陈某某', scores: { e2: { chinese: 90 } } }
  ]
  store.studentsByClass.C2 = [
    { id: '3', name: '李四', scores: { e2: { chinese: 80 } } }
  ]
  store.classes = [
    { id: 'C1', name: '591班' },
    { id: 'C2', name: '592班' }
  ]
  store.exams = [{ key: 'e2', name: '期中' }]
  store.subjects = [{ key: 'chinese', name: '语文', full: 120 }]
  store.activeClass = 'C1'
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('登录校验', () => {
  it('账号或密码错误 → 拒绝', async () => {
    const store = useGradeStore()
    seed(store)
    const r = await store.login('admin', 'wrong', '禾皓轩')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('账号或密码错误')
    expect(store.authed).toBe(false)
  })

  it('姓名为空 → 提示请输入', async () => {
    const store = useGradeStore()
    seed(store)
    const r = await store.login('admin', 'admin', '   ')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('请输入学生姓名')
  })

  it('姓名不存在 → 学生不存在且停留（authed 仍 false）', async () => {
    const store = useGradeStore()
    seed(store)
    const r = await store.login('admin', 'admin', '不存在的人')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('学生不存在')
    expect(store.authed).toBe(false)
    expect(store.pinName).toBe('')
  })

  it('姓名存在 → 登录成功并设为关注学生', async () => {
    const store = useGradeStore()
    seed(store)
    const r = await store.login('admin', 'admin', '陈某某')
    expect(r.ok).toBe(true)
    expect(store.authed).toBe(true)
    expect(store.pinName).toBe('陈某某')
    expect(store.focusLabel).toBe('陈某某')
  })

  it('登录他人后 focusLabel 不再是禾皓轩', async () => {
    const store = useGradeStore()
    seed(store)
    await store.login('admin', 'admin', '陈某某')
    expect(store.focusLabel).toBe('陈某某')
    expect(store.focusLabel).not.toBe('禾皓轩')
  })

  it('登录跨班会切到该生所在班', async () => {
    const store = useGradeStore()
    seed(store)
    await store.login('admin', 'admin', '李四')
    expect(store.activeClass).toBe('C2')
    expect(store.person?.id).toBe('3')
  })

  it('登录姓名两侧空格会被 trim', async () => {
    const store = useGradeStore()
    seed(store)
    const r = await store.login('admin', 'admin', '  陈某某  ')
    expect(r.ok).toBe(true)
    expect(store.pinName).toBe('陈某某')
  })
})

describe('关注学生判定 isPin', () => {
  it('未登录时回退默认 禾皓轩', () => {
    const store = useGradeStore()
    seed(store)
    expect(store.focusLabel).toBe('禾皓轩')
    const he = store.studentsByClass.C1.find(s => s.name === '禾皓轩')
    expect(store.isPin(he)).toBe(true)
  })

  it('登录后只认登录姓名', async () => {
    const store = useGradeStore()
    seed(store)
    await store.login('admin', 'admin', '陈某某')
    const chen = store.studentsByClass.C1.find(s => s.name === '陈某某')
    const he = store.studentsByClass.C1.find(s => s.name === '禾皓轩')
    expect(store.isPin(chen)).toBe(true)
    expect(store.isPin(he)).toBe(false)
  })

  it('normalizePin 后仅关注学生 pin=true', async () => {
    const store = useGradeStore()
    seed(store)
    await store.login('admin', 'admin', '陈某某')
    store.normalizePin()
    const list = store.studentsByClass.C1
    expect(list.filter(s => s.pin === true).map(s => s.name)).toEqual(['陈某某'])
  })
})

describe('findStudentByName', () => {
  it('跨班命中返回学生与班级', () => {
    const store = useGradeStore()
    seed(store)
    const hit = store.findStudentByName('李四')
    expect(hit.student.id).toBe('3')
    expect(hit.classId).toBe('C2')
  })
  it('未命中返回 null', () => {
    const store = useGradeStore()
    seed(store)
    expect(store.findStudentByName('路人甲')).toBeNull()
    expect(store.findStudentByName('')).toBeNull()
  })
})

describe('logout 与持久化', () => {
  it('logout 置 authed=false', async () => {
    const store = useGradeStore()
    seed(store)
    await store.login('admin', 'admin', '陈某某')
    expect(store.authed).toBe(true)
    store.logout()
    expect(store.authed).toBe(false)
  })

  it('登录态写入独立 localStorage 键', async () => {
    const store = useGradeStore()
    seed(store)
    await store.login('admin', 'admin', '陈某某')
    const raw = JSON.parse(localStorage.getItem('study_compass_vue_auth'))
    expect(raw.authed).toBe(true)
    expect(raw.pinName).toBe('陈某某')
  })
})
