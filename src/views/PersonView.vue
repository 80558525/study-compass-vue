<template>
  <div>
    <div class="sc-toolbar">
      <span style="font-weight:700">选择学生：</span>
      <van-button size="small" plain @click="stuVisible = true">{{ person ? person.name : '—' }} ▾</van-button>
      <div style="flex:1"></div>
      <span class="sc-subj-chip"><i style="background:var(--sc-red)"></i>{{ meta }}</span>
    </div>

    <div class="sc-grid two">
      <div class="sc-card"><h3>总分与班级平均走势</h3><div class="hint">各考试批次对比</div><EChart :option="pTrend" height="280px" /></div>
      <div class="sc-card"><h3>各科能力雷达</h3><div class="hint">最近批次 · 得分率 %</div><EChart :option="pRadar" height="280px" /></div>
    </div>

    <div class="sc-card"><h3>各科分数走势</h3><div class="hint">每科一条线</div><EChart :option="pSubj" height="300px" /></div>

    <div class="sc-card"><h3>班级排名 vs 年级排名 走势</h3><div class="hint">{{ rankHint }}</div><EChart :option="pRank" height="300px" /></div>

    <div class="sc-card">
      <h3>各科年级名次</h3>
      <div class="sc-toolbar">
        <van-dropdown-menu><van-dropdown-item v-model="subjRankExam" :options="examOptions" /></van-dropdown-menu>
        <div style="flex:1"></div>
        <span class="sc-subj-chip">
          <i :style="{ background: (store.realModeOn(subjRankExam) || store.hasSheetRanks(subjRankExam)) ? 'var(--sc-gold)' : 'var(--sc-ink-faint)' }"></i>
          {{ store.realModeOn(subjRankExam) ? `真实年级数据 · ${store.real.byExam[subjRankExam].size}人` : store.hasSheetRanks(subjRankExam) ? '成绩单真实年排' : '估算模型' }}
        </span>
      </div>

      <div v-if="!store.realModeOn(subjRankExam) && !store.hasSheetRanks(subjRankExam)" class="sc-note">
        该批次尚未导入真实年级数据。请到「数据编辑器 → ④ 真实年级数据导入」上传全年级逐人成绩后，此处将显示每科真实年级名次与百分位。
      </div>
      <div v-else class="sc-tbl-wrap">
        <table class="sc-tbl">
          <thead><tr><th>科目</th><th class="num">得分</th><th class="num">年级名次</th><th class="num">年级百分位</th></tr></thead>
          <tbody>
            <tr v-for="r in subjRankRows" :key="r.name">
              <td>{{ r.name }}</td><td class="num">{{ r.v }}</td>
              <td class="num" style="font-weight:700;color:var(--sc-gold)">{{ r.r || '—' }}</td>
              <td class="num">{{ r.pct }}</td>
            </tr>
            <tr style="background:#F1E9D8">
              <td>总分</td><td class="num" style="font-weight:700">{{ totalRank.total }}</td>
              <td class="num" style="font-weight:700;color:var(--sc-red)">{{ totalRank.tr || '—' }}</td>
              <td class="num">{{ totalRank.pct }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <van-popup v-model:show="stuVisible" position="bottom" round>
      <div style="padding:8px 4px 16px;max-height:60vh;overflow:auto">
        <van-cell
          v-for="s in store.students" :key="s.id" :is-link="false"
          :title="s.name + (store.isPin(s) ? ' ★' : '')"
          :style="s.id === (person && person.id) ? 'color:var(--sc-red);font-weight:700' : ''"
          @click="pickStu(s.id)"
        />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGradeStore } from '../stores/grade'
import EChart from '../components/EChart.vue'

const store = useGradeStore()
const FONT = '"PingFang SC","Microsoft YaHei",sans-serif'
const shortName = n => (n || '').replace(/^[^·]*·/, '')

const stuVisible = ref(false)
const subjRankExam = ref(store.lastExamKey)
watch(() => store.lastExamKey, v => { if (!subjRankExam.value) subjRankExam.value = v })
const examOptions = computed(() => store.exams.map(e => ({ text: e.name, value: e.key })))

const person = computed(() => store.person)
const meta = computed(() => person.value
  ? [person.value.name, person.value.gender, `学号 ${person.value.id}`].filter(Boolean).join(' · ')
  : '暂无学生')

function pickStu(id) { store.personId = id; stuVisible.value = false }

const pTrend = computed(() => {
  const st = person.value; if (!st) return {}
  return {
    grid: { left: 8, right: 16, top: 30, bottom: 44, containLabel: true },
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontFamily: FONT } },
    xAxis: { type: 'category', data: store.exams.map(e => shortName(e.name)), axisLabel: { fontFamily: FONT, fontSize: 11 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontFamily: FONT }, splitLine: { lineStyle: { color: 'rgba(30,36,48,.08)' } } },
    series: [
      { name: st.name, type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 3, color: '#C0392B' }, itemStyle: { color: '#C0392B' }, areaStyle: { color: 'rgba(192,57,43,.1)' }, data: store.exams.map(ex => store.total(st, ex.key)) },
      { name: '班级平均', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#8A93A3', type: 'dashed' }, data: store.exams.map(ex => Math.round(store.classAvg(ex.key))) }
    ]
  }
})

const pRadar = computed(() => {
  const st = person.value; if (!st) return {}
  const ex = store.lastExamKey
  const mine = store.subjects.map(s => Math.round(store.pctOf(st, ex, s)))
  const avg = store.subjects.map(s => Math.round(store.students.reduce((a, x) => a + store.pctOf(x, ex, s), 0) / Math.max(1, store.students.length)))
  return {
    tooltip: {}, legend: { bottom: 0, textStyle: { fontFamily: FONT } },
    radar: { indicator: store.subjects.map(s => ({ name: s.name, max: 100 })), radius: '62%', axisName: { color: '#4A5464', fontFamily: FONT, fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(30,36,48,.1)' } } },
    series: [{ type: 'radar', data: [
      { name: st.name, value: mine, lineStyle: { color: '#C0392B' }, itemStyle: { color: '#C0392B' }, areaStyle: { color: 'rgba(192,57,43,.18)' } },
      { name: '班级平均', value: avg, lineStyle: { color: '#2E5E8C' }, itemStyle: { color: '#2E5E8C' }, areaStyle: { color: 'rgba(46,94,140,.12)' } }
    ] }]
  }
})

const pSubj = computed(() => {
  const st = person.value; if (!st) return {}
  return {
    grid: { left: 8, right: 16, top: 24, bottom: 44, containLabel: true },
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, type: 'scroll', textStyle: { fontFamily: FONT, fontSize: 11 } },
    xAxis: { type: 'category', data: store.exams.map(e => shortName(e.name)), axisLabel: { fontFamily: FONT, fontSize: 11 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontFamily: FONT }, splitLine: { lineStyle: { color: 'rgba(30,36,48,.08)' } } },
    series: store.subjects.map(s => ({ name: s.name, type: 'line', smooth: true, symbolSize: 4, lineStyle: { width: 2 }, itemStyle: { color: s.color }, data: store.exams.map(ex => st.scores[ex.key]?.[s.key] || 0) }))
  }
})

const pRank = computed(() => {
  const st = person.value; if (!st) return {}
  const gs = store.params.gradeSize || 2000
  return {
    grid: { left: 8, right: 8, top: 30, bottom: 46, containLabel: true },
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontFamily: FONT } },
    xAxis: { type: 'category', data: store.exams.map(e => shortName(e.name)), axisLabel: { fontFamily: FONT, fontSize: 11 } },
    yAxis: [
      { type: 'value', inverse: true, name: '班级排名', nameLocation: 'start', nameGap: 14, position: 'left', axisLabel: { fontFamily: FONT }, splitLine: { lineStyle: { color: 'rgba(192,57,43,.12)' } } },
      { type: 'value', inverse: true, name: `年级排名(${gs})`, nameLocation: 'start', nameGap: 14, position: 'right', axisLabel: { fontFamily: FONT }, splitLine: { show: false } }
    ],
    series: [
      { name: '班级排名', type: 'line', yAxisIndex: 0, smooth: true, symbolSize: 7, lineStyle: { width: 3, color: '#C0392B' }, itemStyle: { color: '#C0392B' }, data: store.exams.map(ex => store.RANK[ex.key]?.[st.id] || null) },
      { name: '年级排名', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 7, lineStyle: { width: 3, color: '#B07A2A' }, itemStyle: { color: '#B07A2A' }, data: store.exams.map(ex => store.GRADE_RANK[ex.key]?.[st.id] || null) }
    ]
  }
})

const subjRankRows = computed(() => {
  const st = person.value; if (!st) return []
  const ex = subjRankExam.value
  return store.subjects.map(s => {
    const v = st.scores[ex]?.[s.key] || 0
    const r = store.SUBJECT_GRADE_RANK[ex]?.[s.key]?.[st.id]
    const gs = store.examSize(ex)
    return { name: s.name, v, r, pct: r ? Math.round((1 - r / gs) * 1000) / 10 + '%' : '—' }
  })
})
const totalRank = computed(() => {
  const st = person.value; if (!st) return null
  const ex = subjRankExam.value
  const tr = store.GRADE_RANK[ex]?.[st.id]
  const gs = store.examSize(ex)
  return { total: store.total(st, ex), tr, pct: tr ? Math.round((1 - tr / gs) * 1000) / 10 + '%' : '—' }
})
const rankHint = computed(() => {
  const gs = store.params.gradeSize || 2000
  return `双轴对比 · 名次越小越靠前（纵轴已反转）· 年级按全年级 ${gs} 人估算`
})
</script>
