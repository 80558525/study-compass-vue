<template>
  <div>
    <div class="sc-kpi">
      <div class="cell"><span class="dot"></span><div class="lab">统计学生数</div><div class="val">{{ kpi.stu }}<small> 人</small></div></div>
      <div class="cell"><span class="dot"></span><div class="lab">最近批次均分</div><div class="val">{{ kpi.avg }}<small> / {{ kpi.full }}</small></div></div>
      <div class="cell"><span class="dot"></span><div class="lab">最高总分</div><div class="val">{{ kpi.max }}<small> 分</small></div></div>
      <div class="cell"><span class="dot"></span><div class="lab">整体及格率</div><div class="val">{{ kpi.pass }}<small> %</small></div></div>
      <div class="cell" v-if="gradeKpi"><span class="dot" style="background:var(--sc-gold)"></span><div class="lab">年级均分（估算）</div><div class="val">{{ gradeKpi.avg }}<small> / {{ kpi.full }}</small></div></div>
      <div class="cell" v-if="gradeKpi"><span class="dot" style="background:var(--sc-gold)"></span><div class="lab">年级及格率（估算）</div><div class="val">{{ gradeKpi.passPct }}<small> %</small></div></div>
    </div>

    <div class="sc-grid two">
      <div class="sc-card"><h3>各科班级平均分</h3><div class="hint">最近一次考试 · 平均分值（满分：语数英120 / 史政75）</div><EChart :option="subjBar" /></div>
      <div class="sc-card"><h3>总分分布</h3><div class="hint">按总分五档统计人数（得分率 60% / 70% / 80% / 90% 为界）</div><EChart :option="distPie" /></div>
    </div>

    <div class="sc-grid two">
      <div class="sc-card"><h3>关注学生 · 总分走势</h3><div class="hint">本班之星或 {{ store.focusLabel }} 相对班级平均的位置</div><EChart :option="trendLine" height="280px" /></div>
      <div class="sc-card">
        <h3>总分排行榜 TOP 10</h3><div class="hint">最近一次考试</div>
        <div class="sc-tbl-wrap">
          <table class="sc-tbl">
            <thead><tr><th class="ctr">名次</th><th>姓名</th><th class="num">总分</th><th class="num">得分率</th><th class="num">年级名次</th></tr></thead>
            <tbody>
              <tr v-for="s in top10" :key="s.id" :class="{ pin: store.isPin(s) }">
                <td class="sc-rank"><span :class="{ top3: s.rank <= 3 }">{{ s.rank }}</span></td>
                <td>{{ s.name }}</td>
                <td class="num">{{ s.total }}</td>
                <td class="num">{{ s.rate }}%</td>
                <td class="num" style="color:var(--sc-gold);font-weight:700">{{ s.grade }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGradeStore } from '../stores/grade'
import { estimateGradeMetrics } from '../logic/analytics'
import EChart from '../components/EChart.vue'

const store = useGradeStore()
const FONT = '"PingFang SC","Microsoft YaHei",sans-serif'
const shortName = n => (n || '').replace(/^[^·]*·/, '')

const lastKey = computed(() => store.lastExamKey)
const kpi = computed(() => {
  const ex = lastKey.value
  const list = store.students
  let mx = 0
  list.forEach(s => { mx = Math.max(mx, store.total(s, ex)) })
  const pass = list.filter(s => store.total(s, ex) / store.full() >= 0.6).length
  return {
    stu: list.length,
    avg: Math.round(store.classAvg(ex)),
    full: store.full(),
    max: mx,
    pass: Math.round(pass / Math.max(1, list.length) * 100)
  }
})

const gradeKpi = computed(() => {
  const ex = lastKey.value
  const anchors = store.students
    .map(s => ({ rank: s.ranks?.[ex]?.total, total: store.total(s, ex) }))
    .filter(a => a.rank != null)
  const m = estimateGradeMetrics(anchors, store.params.gradeSize, store.full(), 0.6)
  return m ? { avg: Math.round(m.avg), passPct: m.passPct, covered: m.covered, size: store.params.gradeSize } : null
})

const subjBar = computed(() => {
  const ex = lastKey.value
  const data = store.subjects.map(s => {
    const v = store.students.reduce((a, st) => a + (st.scores[ex]?.[s.key] || 0), 0) / Math.max(1, store.students.length)
    return Math.round(v)
  })
  return {
    grid: { left: 8, right: 12, top: 30, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: v => v + ' 分' },
    xAxis: { type: 'category', data: store.subjects.map(s => s.name), axisLabel: { fontFamily: FONT, fontSize: 11, interval: 0, rotate: store.subjects.length > 6 ? 30 : 0 } },
    yAxis: { type: 'value', scale: true, axisLabel: { formatter: '{value}', fontFamily: FONT }, splitLine: { lineStyle: { color: 'rgba(30,36,48,.08)' } } },
    series: [{ type: 'bar', data: data.map((v, i) => ({ value: v, itemStyle: { color: store.subjects[i].color, borderRadius: [6, 6, 0, 0] } })), barWidth: '58%', label: { show: true, position: 'top', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#1E2430' } }]
  }
})

const distPie = computed(() => {
  const ex = lastKey.value
  const ft = store.full()
  const thr = [0, .6, .7, .8, .9, 1].map(x => Math.round(x * ft))
  const bins = [0, 0, 0, 0, 0]
  store.students.forEach(s => {
    const t = store.total(s, ex)
    if (t < thr[1]) bins[0]++
    else if (t < thr[2]) bins[1]++
    else if (t < thr[3]) bins[2]++
    else if (t < thr[4]) bins[3]++
    else bins[4]++
  })
  const segNames = [
    `不及格 <${thr[1]}`,
    `及格 ${thr[1]}–${thr[2] - 1}`,
    `良好 ${thr[2]}–${thr[3] - 1}`,
    `优秀 ${thr[3]}–${thr[4] - 1}`,
    `顶尖 ≥${thr[4]}`
  ]
  const colors = ['#B0413E', '#D98C3F', '#C7B04A', '#5B9E6F', '#2E5E8C']
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { right: 0, top: 'center', orient: 'vertical', textStyle: { fontFamily: FONT, fontSize: 12 } },
    series: [{ type: 'pie', radius: ['44%', '70%'], center: ['34%', '50%'], avoidLabelOverlap: true, label: { show: false },
      data: segNames.map((n, i) => ({ name: n, value: bins[i], itemStyle: { color: colors[i] } })) }]
  }
})

const trendLine = computed(() => {
  const sorted = [...store.students].sort((a, b) => store.total(b, lastKey.value) - store.total(a, lastKey.value))
  const hero = store.pinStudent || sorted[0] || store.students[0]
  return {
    grid: { left: 8, right: 16, top: 30, bottom: 44, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontFamily: FONT } },
    xAxis: { type: 'category', data: store.exams.map(e => shortName(e.name)), axisLabel: { fontFamily: FONT, fontSize: 11 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontFamily: FONT }, splitLine: { lineStyle: { color: 'rgba(30,36,48,.08)' } } },
    series: [
      { name: hero ? hero.name : store.focusLabel, type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 3, color: '#C0392B' }, itemStyle: { color: '#C0392B' }, data: store.exams.map(ex => hero ? store.total(hero, ex.key) : 0) },
      { name: '班级平均', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#8A93A3', type: 'dashed' }, data: store.exams.map(ex => Math.round(store.classAvg(ex.key))) }
    ]
  }
})

const top10 = computed(() => {
  const ex = lastKey.value
  const ft = store.full()
  return [...store.students].sort((a, b) => store.total(b, ex) - store.total(a, ex)).slice(0, 10)
    .map((s, i) => ({ ...s, rank: i + 1, total: store.total(s, ex), rate: Math.round(store.total(s, ex) / ft * 100), grade: store.GRADE_RANK[ex]?.[s.id] || '-' }))
})
</script>
