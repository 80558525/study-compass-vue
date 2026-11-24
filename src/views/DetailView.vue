<template>
  <div>
    <div class="sc-toolbar">
      <van-button size="small" plain @click="examVisible = true">
        {{ (store.exams.find(e => e.key === (store.examKey || store.lastExamKey)) || {}).name || '选择批次' }} ▾
      </van-button>
      <van-search v-model="store.search" placeholder="搜索姓名…" shape="round" style="flex:1;min-width:160px;background:transparent;padding:0" />
      <van-button size="small" type="primary" @click="doExport">导出 Excel</van-button>
    </div>

    <div class="sc-tbl-wrap">
      <table class="sc-tbl">
        <thead>
          <tr>
            <th class="ctr" @click="toggleSort('clsRank')">名次</th>
            <th @click="toggleSort('name')">姓名</th>
            <th v-for="su in store.subjects" :key="su.key" class="num" :style="{ background: subjBg(su.color, .22) }" @click="toggleSort(su.key)">
              {{ su.name }}<br><small style="opacity:.6">/{{ su.full }}</small>
            </th>
            <th class="num" style="background:rgba(30,36,48,.10)" @click="toggleSort('total')">总分</th>
            <th class="num" style="background:rgba(176,122,42,.18)">年级排名</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id" :class="{ pin: store.isPin(s) }">
            <td class="sc-rank">{{ store.RANK[store.examKey || store.lastExamKey]?.[s.id] || '-' }}</td>
            <td>{{ s.name }}<span v-if="store.isPin(s)" style="color:var(--sc-red)"> ★</span></td>
            <td v-for="su in store.subjects" :key="su.key" class="num bar-cell" :style="{ background: subjBg(su.color, .10) }">
              <div class="bar" :style="{ width: ((s.scores[store.examKey||store.lastExamKey]?.[su.key]||0)/su.full*100)+'%', background: su.color, opacity: cellOpacity(su,s)/100 }"></div>
              <span>{{ s.scores[store.examKey||store.lastExamKey]?.[su.key] || 0 }}</span>
            </td>
            <td class="num" style="font-weight:700;background:rgba(30,36,48,.06)">{{ store.total(s, store.examKey || store.lastExamKey) }}</td>
            <td class="num" style="color:var(--sc-gold);font-weight:700;background:rgba(176,122,42,.10)">{{ store.GRADE_RANK[store.examKey || store.lastExamKey]?.[s.id] || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sc-note">点击表头可排序 · 带 ★ 为关注学生 {{ store.focusLabel }} · 每科按科目色分列，单元格内条形色深表示得分率</div>

    <van-popup v-model:show="examVisible" position="bottom" round>
      <div style="padding:8px 4px 16px">
        <van-cell
          v-for="ex in store.exams" :key="ex.key" :title="ex.name" :boundry="false"
          :style="ex.key === (store.examKey||store.lastExamKey) ? 'color:var(--sc-red);font-weight:700' : ''"
          is-link @click="pickExam(ex.key)"
        />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGradeStore } from '../stores/grade'
import { showToast } from 'vant'
import { exportDetail, exportCsvFallback } from '../utils/exporter'

const store = useGradeStore()

const examVisible = ref(false)
const sortKey = ref('clsRank')
const sortDir = ref(1) // 1 asc, -1 desc

function pickExam(key) { store.examKey = key; examVisible.value = false }

const rows = computed(() => {
  const ex = store.examKey || store.lastExamKey
  const q = (store.search || '').trim()
  let list = store.students.filter(s => !q || s.name.includes(q))
  const val = s => {
    switch (sortKey.value) {
      case 'name': return s.name
      case 'total': return store.total(s, ex)
      case 'clsRank': return store.RANK[ex]?.[s.id] || 9999
      case 'gradeRank': return store.GRADE_RANK[ex]?.[s.id] || 9999
      default: { const k = sortKey.value; return s.scores[ex]?.[k] || 0 }
    }
  }
  return [...list].sort((a, b) => {
    const va = val(a), vb = val(b)
    if (typeof va === 'string') return sortDir.value * va.localeCompare(vb, 'zh')
    return sortDir.value * (va - vb)
  })
})

function toggleSort(key) {
  if (sortKey.value === key) sortDir.value *= -1
  else { sortKey.value = key; sortDir.value = key === 'name' ? 1 : -1 }
}

function cellOpacity(su, st) {
  const ex = store.examKey || store.lastExamKey
  const p = (st.scores[ex]?.[su.key] || 0) / su.full
  return Math.round(p * 40 + 10)
}

// 科目色 hex → 带透明度 rgba，用于整列统一淡底色
function subjBg(hex, a) {
  const h = (hex || '').replace('#', '')
  if (h.length < 6) return `rgba(30,36,48,${a})`
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function doExport() {
  try { exportDetail(store); showToast('已导出 Excel（4 个工作表）') }
  catch (e) { exportCsvFallback(store); showToast('Excel 组件异常，已改用 CSV 下载') }
}
</script>
