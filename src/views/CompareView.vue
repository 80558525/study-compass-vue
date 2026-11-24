<template>
  <div>
    <div class="sc-toolbar">
      <span style="font-weight:700">对比学生（可多选）：</span>
      <div style="flex:1"></div>
      <van-button size="small" plain @click="cmpPop = true">
        {{ (store.exams.find(e => e.key === examVisible) || {}).name }} ▾
      </van-button>
    </div>

    <div class="sc-card">
      <div class="sc-cmp-quick">
        <van-button size="mini" plain @click="quick('pin')">★ {{ store.focusLabel }}</van-button>
        <van-button size="mini" plain @click="quick('top5')">TOP 5</van-button>
        <van-button size="mini" plain @click="quick('all')">全选</van-button>
        <van-button size="mini" plain @click="quick('none')">清空</van-button>
        <span class="sc-cmp-count">已选 {{ count }} 人</span>
      </div>
      <div class="sc-cmp-chips">
        <button
          v-for="s in store.cmpOrdered" :key="s.id"
          class="sc-chip" :class="{ on: store.cmpSel.includes(s.id), pin: store.isPin(s) }"
          @click="toggle(s.id)"
        ><span class="ck">✓</span>{{ s.name }}</button>
      </div>
    </div>

    <div class="sc-card">
      <h3>各科得分率对比</h3>
      <div class="hint">含班级平均参照线 · 得分率 = 得分 / 满分</div>
      <EChart :option="cmpOption" height="300px" v-if="count" />
      <div v-else class="sc-note">请至少选择 1 名学生进行对比。</div>
      <div class="sc-legend">
        <span class="sc-subj-chip" v-for="(l, i) in legend" :key="i"><i :style="{ background: l.color }"></i>{{ l.label }}</span>
      </div>
    </div>

    <van-popup v-model:show="cmpPop" position="bottom" round>
      <div style="padding:8px 4px 16px">
        <van-cell v-for="ex in store.exams" :key="ex.key" is-link :title="ex.name"
          :style="ex.key === examVisible ? 'color:var(--sc-red);font-weight:700' : ''" @click="pickExam(ex.key)" />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast } from 'vant'
import { useGradeStore } from '../stores/grade'
import EChart from '../components/EChart.vue'

const store = useGradeStore()
const FONT = '"PingFang SC","Microsoft YaHei",sans-serif'

const examVisible = computed(() => store.cmpExam || store.lastExamKey)
const count = computed(() => store.cmpSel.length)

function toggle(id) {
  const i = store.cmpSel.indexOf(id)
  if (i >= 0) store.cmpSel.splice(i, 1)
  else store.cmpSel.push(id)
  store.persist()
}
function quick(q) {
  const ex = examVisible.value
  if (q === 'none') store.cmpSel = []
  else if (q === 'all') store.cmpSel = store.students.map(s => s.id)
  else if (q === 'pin') { selectPin(); return }
  else if (q === 'top5') store.cmpSel = [...store.students].sort((a, b) => store.total(b, ex) - store.total(a, ex)).slice(0, 5).map(s => s.id)
  store.persist()
}
function selectPin() {
  const { student, switched, className } = store.focusPin()
  if (student) {
    if (switched) showToast('已切换到「' + className + '」')
    store.cmpSel = [student.id]
    store.persist()
  } else {
    showToast(`数据中未找到${store.focusLabel}`)
  }
}
function pickExam(key) { store.cmpExam = key; cmpPop.value = false }

const cmpPop = ref(false)

const cmpOption = computed(() => {
  const ex = examVisible.value
  const chosen = store.students.filter(s => store.cmpSel.includes(s.id))
  const series = chosen.map(s => ({
    name: s.name, type: 'line', smooth: true, symbolSize: 5,
    lineStyle: { width: store.isPin(s) ? 3 : 2, color: store.isPin(s) ? '#C0392B' : '#2E5E8C' },
    itemStyle: { color: store.isPin(s) ? '#C0392B' : '#2E5E8C' },
    data: store.subjects.map(su => Math.round(store.pctOf(s, ex, su)))
  }))
  series.push({
    name: '班级平均', type: 'line', smooth: true, symbol: 'none',
    lineStyle: { width: 2, color: '#B07A2A', type: 'dashed' }, itemStyle: { color: '#B07A2A' },
    data: store.subjects.map(su => Math.round(store.students.reduce((a, x) => a + store.pctOf(x, ex, su), 0) / Math.max(1, store.students.length)))
  })
  return {
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: v => v + '%' },
    xAxis: { type: 'category', data: store.subjects.map(s => s.name), axisLabel: { fontFamily: FONT, fontSize: 11, interval: 0, rotate: store.subjects.length > 6 ? 30 : 0 } },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontFamily: FONT }, splitLine: { lineStyle: { color: 'rgba(30,36,48,.08)' } } },
    series
  }
})
const legend = computed(() => {
  const chosen = store.students.filter(s => store.cmpSel.includes(s.id))
  return [...chosen.map(s => ({ label: s.name, color: store.isPin(s) ? '#C0392B' : '#2E5E8C' })), { label: '班级平均', color: '#B07A2A' }]
})
</script>
