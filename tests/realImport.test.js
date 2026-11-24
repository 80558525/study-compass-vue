// src/utils/realImport.js —— 真实年级数据解析单测
import { describe, it, expect } from 'vitest'
import { parseCsvText, buildRealFromRows } from '../src/utils/realImport.js'

const subjects = [
  { key: 'chinese', name: '语文', full: 120 },
  { key: 'math', name: '数学', full: 120 },
  { key: 'english', name: '英语', full: 120 }
]

describe('parseCsvText', () => {
  it('逗号分隔解析为二维数组', () => {
    const rows = parseCsvText('姓名,语文,数学\n张三,100,110\n李四,90,95')
    expect(rows).toEqual([
      ['姓名', '语文', '数学'],
      ['张三', '100', '110'],
      ['李四', '90', '95']
    ])
  })
  it('制表符分隔优先（粘贴自表格）', () => {
    const rows = parseCsvText('姓名\t语文\t数学\n张三\t100\t110')
    expect(rows[0]).toEqual(['姓名', '语文', '数学'])
  })
  it('去除空行与 \\r', () => {
    const rows = parseCsvText('a,b\r\nc,d\r\n\r\n')
    expect(rows.length).toBe(2)
  })
  it('空文本返回空数组', () => {
    expect(parseCsvText('')).toEqual([])
  })
})

describe('buildRealFromRows', () => {
  it('表头不足（<2 行）抛错', () => {
    expect(() => buildRealFromRows([['姓名', '语文']], subjects)).toThrow()
  })
  it('解析总分与各科降序分布', () => {
    const rows = [
      ['姓名', '语文', '数学', '英语', '总分'],
      ['A', '100', '110', '120', '330'],
      ['B', '90', '95', '100', '285'],
      ['C', '80', '85', '90', '255']
    ]
    const r = buildRealFromRows(rows, subjects)
    expect(r.size).toBe(3)
    expect(r.total).toEqual([330, 285, 255]) // 降序
    expect(r.subjects.chinese).toEqual([100, 90, 80])
    expect(r.subjects.math).toEqual([110, 95, 85])
  })
  it('无总分区时按各科求和', () => {
    const rows = [
      ['姓名', '语文', '数学', '英语'],
      ['A', '100', '110', '120']
    ]
    const r = buildRealFromRows(rows, subjects)
    expect(r.total).toEqual([330])
  })
  it('名次/排名列被识别为非科目（不计入）', () => {
    const rows = [
      ['姓名', '总分名次', '语文', '数学', '英语'],
      ['A', '1', '100', '110', '120']
    ]
    const r = buildRealFromRows(rows, subjects)
    expect(r.size).toBe(1)
    expect(r.total).toEqual([330]) // 名次列未被当总分/科目
  })
  it('无有效学生行抛错', () => {
    expect(() => buildRealFromRows([['姓名', '无关列']], subjects)).toThrow()
  })
})
