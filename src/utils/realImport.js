/**
 * src/utils/realImport.js —— 真实全年级数据解析（CSV 粘贴 / xlsx 文件 → 经验分布结构）
 * 输出 { size, total[], subjects{ [key]: number[] 降序 } }，供 store.importReal 写入 real.byExam。
 */
import * as XLSX from 'xlsx'

export function parseCsvText(text) {
  text = text.replace(/\r/g, '').trim()
  const lines = text.split('\n').filter(l => l.length)
  if (!lines.length) return []
  const delim = (lines[0].split('\t').length > lines[0].split(',').length) ? '\t' : ','
  return lines.map(l => l.split(delim).map(c => c.trim()))
}

function matchSubject(h, subjects) {
  h = (h || '').trim()
  if (/名次|排名|位次|序号|编号/.test(h)) return undefined
  h = h.replace(/\s|年级|成绩|得分|分数/g, '')
  return subjects.find(s => s.name === h || h.includes(s.name) || s.name.includes(h))
}

export function buildRealFromRows(rows, subjects) {
  if (rows.length < 2) throw '数据不足：至少需要表头 + 1 行'
  const head = rows[0]
  const colSub = head.map(h => matchSubject(h, subjects))
  const totalCol = head.findIndex(h => /总分/.test(h || '') && !/名次|排名|位次|序号|编号/.test(h || ''))
  const buckets = {}
  subjects.forEach(s => { buckets[s.key] = [] })
  const totals = []
  let n = 0
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length < 2) continue
    let sum = 0, hasAny = false
    subjects.forEach(s => {
      const ci = head.findIndex((h, idx) => colSub[idx] && colSub[idx].key === s.key)
      const v = ci >= 0 ? parseFloat(row[ci]) : NaN
      if (!isNaN(v)) { buckets[s.key].push(v); sum += v; hasAny = true }
    })
    let tot = totalCol >= 0 ? parseFloat(row[totalCol]) : NaN
    if (isNaN(tot)) tot = sum
    if (hasAny || !isNaN(tot)) { totals.push(tot); n++ }
  }
  if (n < 1) throw '未解析到有效学生行，请检查表头科目名'
  const subjSorted = {}
  subjects.forEach(s => { subjSorted[s.key] = buckets[s.key].sort((a, b) => b - a) })
  return { size: n, total: totals.sort((a, b) => b - a), subjects: subjSorted }
}

// 读取 xlsx/csv 文件（浏览器端），返回 aoa 行数组
export function readFileRows(file) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase()
    const rd = new FileReader()
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      rd.onload = e => resolve(parseCsvText(String(e.target.result || '')))
      rd.onerror = () => reject('读取文件失败')
      rd.readAsText(file, 'utf-8')
    } else {
      rd.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
          resolve(aoa)
        } catch (err) { reject('读取文件失败：' + err) }
      }
      rd.onerror = () => reject('读取文件失败')
      rd.readAsArrayBuffer(file)
    }
  })
}
