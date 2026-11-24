/**
 * mock/index.js —— 接口挡板路由表（纯数据映射，无任何逻辑）
 *
 * 每个接口 url 对应 mock/data 下一个 JSON 响应体（挡板）。
 * 想改返回数据：直接编辑 mock/data/*.json 即可（这里本来也没有逻辑）。
 * 新增接口：往 data/ 放一个 json，再在这里加一行 url→json。
 */
import subjects from './data/subjects.json'
import exams from './data/exams.json'
import classes from './data/classes.json'
import students from './data/students.json'
import config from './data/config.json'

export const routes = {
  '/subjects': subjects,
  '/exams': exams,
  '/classes': classes,
  '/students': students, // { C1:[{ id,name,gender,scores:{ e1:{chinese:..}, ... } }], C2:[...], C3:[...] }
  '/config': config
}
