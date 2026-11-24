/**
 * src/stores/grade.js —— 全局状态 + 派生分析 + 操作
 * 数据来源：接口挡板 mock/data/*.json（经 src/api/grade.js 并行拉取后组装）；
 *           编辑器“重新生成”走前端演示生成器 src/demo/genStudents.js（非挡板）。
 *           用户本地编辑与选择持久化在 localStorage。
 * 排名、年级估算、真实分布等派生计算见 src/logic/analytics.js（用 computed 缓存）。
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import * as api from '../api/grade'
import { genAllClasses } from '../demo/genStudents'
import { buildRanking, totalOf as _total, fullTotal as _full, pct as _pct, ncdf, countGreater } from '../logic/analytics'

const LS_KEY = 'study_compass_vue_v4' // v4：mock 增加成绩单真实年排(ranks)，令旧缓存失效以显示真实年级名次
const AUTH_KEY = 'study_compass_vue_auth' // 登录态：{ authed, pinName }
const PIN_NAME = '禾皓轩' // 默认关注学生（登录未指定姓名时的兜底）
const ADMIN_USER = 'admin' // 登录默认账号
const ADMIN_PASS = 'admin' // 登录默认密码

export const useGradeStore = defineStore('grade', () => {
  // ===== 基础数据 =====
  const subjects = ref([])
  const exams = ref([])
  const classes = ref([])
  const studentsByClass = reactive({}) // { classId: student[] }
  const params = reactive({ count: 40, mid: 72, spread: 14, trend: 8, gradeSize: 2000 })
  const real = reactive({ byExam: {} })
  const pinClass = ref('C1')

  // ===== 登录态 =====
  const authed = ref(false)
  const pinName = ref('') // 登录时输入的学生姓名 = 关注学生
  // 同步读取登录态，供路由守卫在 init() 之前判断是否已登录
  function restoreAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (raw) {
        const a = JSON.parse(raw)
        authed.value = !!a.authed
        pinName.value = a.pinName || ''
      }
    } catch (e) { /* 隐私模式忽略 */ }
  }
  restoreAuth()
  function persistAuth() {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ authed: authed.value, pinName: pinName.value })) } catch (e) {}
  }

  // 关注学生判定：以登录姓名为准，未登录时回退默认姓名
  const focusName = () => pinName.value || PIN_NAME
  const isPin = st => !!st && st.name === focusName()
  // 归一化 pin 标记：仅关注学生为 true，保证各视图 ★ 与置顶一致
  function normalizePin() {
    const target = focusName()
    Object.keys(studentsByClass).forEach(cid => {
      (studentsByClass[cid] || []).forEach(st => { st.pin = st.name === target })
    })
  }

  // ===== 视图/选择状态 =====
  const activeClass = ref('C1')
  const examKey = ref('')        // 明细表筛选批次
  const search = ref('')         // 明细搜索
  const personId = ref('')       // 个人趋势所选学生
  const cmpSel = ref([])         // 对比多选
  const cmpExam = ref('')        // 对比批次
  const editStu = ref('')        // 编辑器所选学生
  const editExam = ref('')       // 编辑器所选批次

  const loading = ref(false)

  // ===== 派生：当前班学生 =====
  const students = computed(() => studentsByClass[activeClass.value] || [])
  const lastExamKey = computed(() => exams.value[exams.value.length - 1]?.key || '')
  const activeClassName = computed(() => (classes.value.find(c => c.id === activeClass.value) || {}).name || '')

  // ===== 便捷函数（绑定当前 subjects）=====
  const total = (st, exKey) => _total(st, exKey, subjects.value)
  const full = () => _full(subjects.value)
  const pctOf = (st, exKey, s) => _pct(st, exKey, s)
  const classAvg = exKey => {
    if (!students.value.length) return 0
    return students.value.reduce((a, st) => a + total(st, exKey), 0) / students.value.length
  }
  const examSize = exKey => (real.byExam[exKey] ? real.byExam[exKey].size : (params.gradeSize || 2000))

  // ===== 核心派生排名 =====
  const ranking = computed(() => buildRanking({
    exams: exams.value,
    subjects: subjects.value,
    students: students.value,
    studentsByClass,
    real,
    params
  }))
  const RANK = computed(() => ranking.value.RANK)
  const GRADE_RANK = computed(() => ranking.value.GRADE_RANK)
  const SUBJECT_GRADE_RANK = computed(() => ranking.value.SUBJECT_GRADE_RANK)

  function gradePct(exKey, stuId) {
    const gs = examSize(exKey)
    const r = GRADE_RANK.value[exKey]?.[stuId]
    return r ? Math.round((1 - r / gs) * 1000) / 10 : 0
  }
  const realModeOn = exKey => !!real.byExam[exKey]
  // 成绩单真实年排：当前班任一学生带有 st.ranks[exKey].total 即视为真实来源（无需手动导入全年级分布）
  const hasSheetRanks = exKey => students.value.some(s => s.ranks && s.ranks[exKey] && s.ranks[exKey].total != null)

  // 关注学生展示名：登录姓名优先，未登录回退默认（供各视图文案动态显示）
  const focusLabel = computed(() => pinName.value || PIN_NAME)

  // 当前班的关注学生（禾皓轩）；不在本班时为 null
  const pinStudent = computed(() => students.value.find(isPin) || null)

  // 个人视图默认学生：禾皓轩 → 第一名
  const person = computed(() => {
    const list = students.value
    if (!list.length) return null
    return list.find(s => s.id === personId.value) || list.find(isPin) || list[0]
  })

  // 对比：按总分降序（禾皓轩置顶）
  const cmpOrdered = computed(() => {
    const ex = cmpExam.value || lastExamKey.value
    return [...students.value].sort((a, b) => (isPin(b) ? 1 : 0) - (isPin(a) ? 1 : 0) || total(b, ex) - total(a, ex))
  })

  function initCmpSel() {
    const ex = cmpExam.value || lastExamKey.value
    const ids = []
    const pin = students.value.find(isPin)
    if (pin) ids.push(pin.id)
    ;[...students.value].sort((a, b) => total(b, ex) - total(a, ex)).forEach(s => { if (ids.length < 3 && !ids.includes(s.id)) ids.push(s.id) })
    cmpSel.value = ids
  }

  // ===== 持久化 =====
  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        subjects: subjects.value, exams: exams.value, classes: classes.value,
        studentsByClass, params: { ...params }, real: { byExam: real.byExam },
        pinClass: pinClass.value, activeClass: activeClass.value,
        sel: { examKey: examKey.value, personId: personId.value, cmpSel: cmpSel.value, cmpExam: cmpExam.value, editStu: editStu.value, editExam: editExam.value }
      }))
    } catch (e) { /* 隐私模式忽略 */ }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return false
      const d = JSON.parse(raw)
      if (!d.studentsByClass || !Object.keys(d.studentsByClass).length) return false
      subjects.value = d.subjects || []
      exams.value = d.exams || []
      classes.value = d.classes || []
      Object.keys(studentsByClass).forEach(k => delete studentsByClass[k])
      Object.assign(studentsByClass, d.studentsByClass)
      Object.assign(params, d.params || {})
      Object.keys(real.byExam).forEach(k => delete real.byExam[k])
      Object.assign(real.byExam, d.real?.byExam || {})
      pinClass.value = d.pinClass || 'C1'
      activeClass.value = d.activeClass || (classes.value[0]?.id ?? 'C1')
      const s = d.sel || {}
      examKey.value = s.examKey || ''; personId.value = s.personId || ''
      cmpSel.value = s.cmpSel || []; cmpExam.value = s.cmpExam || ''
      editStu.value = s.editStu || ''; editExam.value = s.editExam || ''
      normalizePin()
      return true
    } catch (e) { return false }
  }

  function assignBootstrap(d) {
    subjects.value = d.subjects
    exams.value = d.exams
    classes.value = d.classes
    pinClass.value = (d.classes.find(c => c.pin) || d.classes[0] || {}).id
    if (d.config && d.config.gradeSize) params.gradeSize = d.config.gradeSize
    Object.keys(studentsByClass).forEach(k => delete studentsByClass[k])
    Object.assign(studentsByClass, d.studentsByClass)
    Object.keys(real.byExam).forEach(k => delete real.byExam[k])
    activeClass.value = (classes.value.find(c => c.id === activeClass.value) ? activeClass.value : classes.value[0].id)
    normalizePin()
  }

  // ===== 初始化 =====
  async function init() {
    loading.value = true
    try {
      if (!restore()) {
        const d = await api.fetchBootstrap()
        assignBootstrap(d)
        if (!cmpSel.value.length) initCmpSel()
      }
      if (!examKey.value) examKey.value = lastExamKey.value
      if (!cmpExam.value) cmpExam.value = lastExamKey.value
      if (!editExam.value) editExam.value = lastExamKey.value
      if (!cmpSel.value.length) initCmpSel()
    } finally { loading.value = false }
  }

  // ===== 班级操作 =====
  function setActiveClass(id) {
    if (!studentsByClass[id] || !classes.value.some(c => c.id === id)) id = classes.value[0].id
    activeClass.value = id
    personId.value = ''
    editStu.value = ''
    initCmpSel()
    persist()
  }
  function addClass(name) {
    if (!name) return
    const id = 'C' + Date.now().toString(36).slice(-4) + classes.value.length
    classes.value.push({ id, name })
    studentsByClass[id] = []
    persist()
    return id
  }
  function delClass(id) {
    if (classes.value.length <= 1) return false
    const cur = classes.value.find(c => c.id === (id || activeClass.value))
    if (!cur) return false
    delete studentsByClass[cur.id]
    classes.value = classes.value.filter(c => c.id !== cur.id)
    if (activeClass.value === cur.id) setActiveClass(classes.value[0].id)
    persist()
    return cur.name
  }
  function renameClass(id, name) {
    const c = classes.value.find(x => x.id === id)
    if (c && name) { c.name = name; persist() }
  }

  // 定位关注学生：本班有则直接返回；否则切到他所在的班再返回（供“禾皓轩”按钮等主动操作复用）
  function focusPin() {
    if (pinStudent.value) return { student: pinStudent.value, switched: false }
    const target = classes.value.find(c => (studentsByClass[c.id] || []).find(isPin))
    if (target) {
      setActiveClass(target.id)
      return { student: pinStudent.value, switched: true, className: target.name }
    }
    return { student: null, switched: false }
  }

  // ===== 登录 =====
  // 跨全部班级按姓名查找学生（去空格精确匹配）
  function findStudentByName(name) {
    if (!name) return null
    const n = String(name).trim()
    for (const cid of Object.keys(studentsByClass)) {
      const hit = (studentsByClass[cid] || []).find(s => s.name === n)
      if (hit) return { student: hit, classId: cid }
    }
    return null
  }
  // 登录：账号密码校验 → 确保数据已加载 → 学生姓名存在性校验 → 设为关注学生
  async function login(user, pass, name) {
    if (String(user).trim() !== ADMIN_USER || String(pass).trim() !== ADMIN_PASS) {
      return { ok: false, error: '账号或密码错误' }
    }
    if (!name || !String(name).trim()) {
      return { ok: false, error: '请输入学生姓名' }
    }
    if (!Object.keys(studentsByClass).length) await init() // 名单校验依赖学生数据
    const found = findStudentByName(name)
    if (!found) return { ok: false, error: '学生不存在' }
    pinName.value = String(name).trim()
    authed.value = true
    normalizePin()
    if (found.classId !== activeClass.value) activeClass.value = found.classId
    personId.value = found.student.id
    initCmpSel()
    persistAuth()
    persist()
    return { ok: true, student: found.student }
  }
  function logout() {
    authed.value = false
    persistAuth()
  }

  // ===== 重新生成一批演示数据（前端 demo 生成器，非挡板）=====
  async function regenerate(newParams) {
    if (newParams) Object.assign(params, newParams)
    const next = genAllClasses({ classes: classes.value, exams: exams.value, subjects: subjects.value, params: { ...params } })
    Object.keys(studentsByClass).forEach(k => delete studentsByClass[k])
    Object.assign(studentsByClass, next)
    normalizePin()
    personId.value = ''; editStu.value = ''
    initCmpSel()
    persist()
  }

  function resetAll() {
    try { localStorage.removeItem(LS_KEY) } catch (e) {}
    return init()
  }

  // ===== 逐人分数精修 =====
  function editScore(stuId, exKey, subjKey, value) {
    const st = (studentsByClass[activeClass.value] || []).find(s => s.id === stuId)
    if (!st) return
    const s = subjects.value.find(x => x.key === subjKey)
    if (!s) return
    if (!st.scores[exKey]) st.scores[exKey] = {}
    st.scores[exKey][subjKey] = Math.max(0, Math.min(+value || 0, s.full))
    persist()
  }
  function setSubjectFull(subjKey, full) {
    const s = subjects.value.find(x => x.key === subjKey)
    if (s) { s.full = +full || 100; persist() }
  }
  function addStudent(name) {
    const list = studentsByClass[activeClass.value] || (studentsByClass[activeClass.value] = [])
    const id = activeClass.value + 'N' + Math.floor(9000 + Math.random() * 999)
    const st = { id, name: name || ('新学生' + id.slice(-4)), gender: '男', scores: {} }
    exams.value.forEach(ex => { st.scores[ex.key] = {}; subjects.value.forEach(s => { st.scores[ex.key][s.key] = Math.round(s.full * params.mid / 100) }) })
    list.push(st)
    persist()
    return id
  }

  // ===== 真实年级数据导入（前端解析后写入 real.byExam）=====
  function importReal(examKey, parsed) {
    real.byExam[examKey] = parsed // { size, total[], subjects{} }
    persist()
  }
  function clearReal(examKey) {
    if (examKey) delete real.byExam[examKey]
    else Object.keys(real.byExam).forEach(k => delete real.byExam[k])
    persist()
  }

  return {
    // state
    subjects, exams, classes, studentsByClass, params, real, pinClass,
    activeClass, examKey, search, personId, cmpSel, cmpExam, editStu, editExam, loading,
    authed, pinName,
    // getters
    students, lastExamKey, activeClassName, RANK, GRADE_RANK, SUBJECT_GRADE_RANK, ranking, person, cmpOrdered,
    isPin, pinStudent, focusLabel,
    // methods
    total, full, pctOf, classAvg, examSize, gradePct, realModeOn, hasSheetRanks, initCmpSel,
    init, persist, setActiveClass, addClass, delClass, renameClass, regenerate, resetAll,
    editScore, setSubjectFull, addStudent, importReal, clearReal, focusPin, normalizePin,
    findStudentByName, login, logout
  }
})
