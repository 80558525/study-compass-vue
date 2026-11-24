/**
 * src/utils/exporter.js —— 成绩导出（Excel 多工作表 / CSV 兜底）
 * 传入 store 实例，读取其排名/分数派生数据。
 */
import * as XLSX from 'xlsx'

function aoeToCsv(rows) {
  return '\ufeff' + rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
}
function download(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
}

export function exportDetail(store) {
  const subjects = store.subjects
  const exams = store.exams
  const cur = store.activeClassName || '班级'
  const last = exams[exams.length - 1]
  const wb = XLSX.utils.book_new()

  // 明细：每人每考试一行
  const detail = [['学号', '姓名', '班级', '考试批次', '日期', ...subjects.map(s => s.name), '总分', '班级排名', '年级排名', '年级百分位%', '得分率']]
  exams.forEach(ex => store.students.forEach(st => {
    const t = store.total(st, ex.key)
    detail.push([st.id, st.name, cur, ex.name, ex.date, ...subjects.map(s => st.scores[ex.key]?.[s.key] || 0),
      t, store.RANK[ex.key]?.[st.id] || '', store.GRADE_RANK[ex.key]?.[st.id] || '', store.gradePct(ex.key, st.id), Math.round(t / store.full() * 1000) / 10])
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), '成绩明细')

  // 各科统计（最近批次）
  const stat = [['科目', '满分', '班级平均', '最高', '最低', '及格率%']]
  subjects.forEach(s => {
    const v = store.students.map(st => st.scores[last.key]?.[s.key] || 0)
    stat.push([s.name, s.full, Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10, Math.max(...v), Math.min(...v), Math.round(v.filter(x => x / s.full >= 0.6).length / v.length * 100)])
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stat), '各科统计')

  // 排名表（最近批次）
  const rank = [['名次', '学号', '姓名', '总分', '年级排名', '年级百分位%', '得分率']]
  ;[...store.students].sort((a, b) => store.total(b, last.key) - store.total(a, last.key)).forEach((st, i) => {
    const t = store.total(st, last.key)
    rank.push([i + 1, st.id, st.name, t, store.GRADE_RANK[last.key]?.[st.id] || '', store.gradePct(last.key, st.id), Math.round(t / store.full() * 1000) / 10])
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rank), '总分排名')

  // 参数说明
  const meta = [['项目', '值'], ['当前班级', cur], ['班级数', store.classes.length], ['本班人数', store.students.length],
    ['全年级人数(估算)', store.params.gradeSize || 2000], ['总分满分', store.full()], ['导出时间', new Date().toLocaleString('zh-CN')]]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), '参数说明')

  XLSX.writeFile(wb, `成绩统计_${cur}_${last.name}.xlsx`)
}

export function exportCsvFallback(store) {
  const last = store.exams[store.exams.length - 1]
  const rows = [['学号', '姓名', ...store.subjects.map(s => s.name), '总分', '班级排名']]
  ;[...store.students].sort((a, b) => store.total(b, last.key) - store.total(a, last.key)).forEach(st => {
    rows.push([st.id, st.name, ...store.subjects.map(s => st.scores[last.key]?.[s.key] || 0), store.total(st, last.key), store.RANK[last.key]?.[st.id] || ''])
  })
  download(new Blob([aoeToCsv(rows)], { type: 'text/csv;charset=utf-8' }), '成绩明细.csv')
}

export function downloadRealTemplate(store) {
  const head = ['姓名', ...store.subjects.map(s => s.name), '总分']
  const demo = ['张示例', ...store.subjects.map(s => Math.round(s.full * 0.72)), store.subjects.reduce((a, s) => a + Math.round(s.full * 0.72), 0)]
  download(new Blob([aoeToCsv([head, demo])], { type: 'text/csv;charset=utf-8' }), '年级数据导入模板.csv')
}
