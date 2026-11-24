/**
 * src/api/grade.js —— 业务接口方法（页面/ store 只认这里；接口路径变更只改这一个文件）
 * 每个方法对应 mock/index.js 里的一条挡板（或真实后端同名接口）。
 */
import http from './http'

// 科目列表：各科 key / 名称 / 满分 / 图表配色（挡板 mock/data/subjects.json）
export const fetchSubjects = () => http.get('/subjects').then(r => r.data)
// 考试批次：各次考试的 key / 名称 / 日期（挡板 mock/data/exams.json）
export const fetchExams = () => http.get('/exams').then(r => r.data)
// 班级列表：各班 id / 名称 / 年级，pin:true 为禾皓轩所在班（挡板 mock/data/classes.json）
export const fetchClasses = () => http.get('/classes').then(r => r.data)
// 各班名单与逐人逐科成绩，形如 { C1:[...], C2:[...], ... }（挡板 mock/data/students.json）
export const fetchStudents = () => http.get('/students').then(r => r.data)
// 全局配置：年级人数等参数（挡板 mock/data/config.json）
export const fetchConfig = () => http.get('/config').then(r => r.data)

// 首屏：并行拉取各接口挡板，在“前端”组装成 store 需要的结构（组装逻辑在 api 层，不在 mock）
export async function fetchBootstrap() {
  const [subjects, exams, classes, students, config] = await Promise.all([
    fetchSubjects(), fetchExams(), fetchClasses(), fetchStudents(), fetchConfig()
  ])
  return { subjects, exams, classes, studentsByClass: students, config }
}
