<template>
  <div>
    <!-- ① -->
    <div class="sc-card">
      <h3>① 全局 mock 参数</h3>
      <div class="hint">调整后松开滑块即“重新生成”，所有页面实时联动</div>
      <div style="padding:8px 4px">
        <div class="sc-field-label"><span>学生人数</span><span class="rv">{{ p.count }}</span></div>
        <van-slider v-model="p.count" :min="5" :max="120" @change="regen" />
        <div class="sc-field-label" style="margin-top:18px"><span>平均分中枢</span><span class="rv">{{ p.mid }}%</span></div>
        <van-slider v-model="p.mid" :min="50" :max="90" @change="regen" />
        <div class="sc-field-label" style="margin-top:18px"><span>离散程度</span><span class="rv">{{ spreadLabel(p.spread) }}</span></div>
        <van-slider v-model="p.spread" :min="5" :max="30" @change="regen" />
        <div class="sc-field-label" style="margin-top:18px"><span>进步趋势强度</span><span class="rv">{{ trendLabel(p.trend) }}</span></div>
        <van-slider v-model="p.trend" :min="0" :max="20" @change="regen" />
        <div class="sc-field-label" style="margin-top:18px"><span>全年级人数（仅影响年级排名）</span><span class="rv">{{ p.gradeSize }}</span></div>
        <van-slider v-model="p.gradeSize" :min="200" :max="4000" :step="100" @change="onGradeChange" />
      </div>
      <div class="sc-toolbar" style="margin-top:12px">
        <van-button type="primary" size="small" :loading="busy" @click="regen">↻ 重新生成 mock 数据</van-button>
        <van-button plain size="small" @click="onReset">恢复默认</van-button>
        <van-button plain size="small" @click="exportDetail(store)">导出 Excel</van-button>
      </div>
      <div class="sc-note">说明：分数按「学生能力值 + 学科偏好 + 随机噪声 + 逐次进步」模型生成；禾皓轩为固定关注学生，随参数一起浮动。</div>
    </div>

    <!-- ② -->
    <div class="sc-card">
      <h3>② 科目与满分配置</h3>
      <div class="hint">修改满分后所有得分率、排名、图表即时重算</div>
      <div>
        <span class="sc-subj-chip" v-for="s in store.subjects" :key="s.key">
          <i :style="{ background: s.color }"></i>{{ s.name }} 满分
          <input class="sc-score-input" type="number" min="10" max="200" :value="s.full" @change="onFull(s.key, $event.target.value)">
        </span>
      </div>
    </div>

    <!-- ③ -->
    <div class="sc-card">
      <h3>③ 逐人分数精修</h3>
      <div class="hint">选学生 → 直接改单元格，失焦即生效</div>
      <div class="sc-toolbar">
        <van-button size="small" plain @click="stuVisible = true">{{ curStu ? curStu.name : '—' }} ▾</van-button>
        <van-button size="small" plain @click="examVisible = true">{{ (store.exams.find(e => e.key === curExam) || {}).name }} ▾</van-button>
        <div style="flex:1"></div>
        <van-button size="small" plain @click="addStu">＋ 新增学生</van-button>
      </div>
      <div v-if="curStu" class="sc-tbl-wrap">
        <table class="sc-tbl">
          <thead><tr><th>科目</th><th class="num">满分</th><th class="num">得分</th><th class="num">得分率</th></tr></thead>
          <tbody>
            <tr v-for="s in store.subjects" :key="s.key">
              <td>{{ s.name }}</td><td class="num">{{ s.full }}</td>
              <td><input class="sc-score-input" type="number" :min="0" :max="s.full" :value="curStu.scores[curExam]?.[s.key] || 0" @change="onScore(s.key, $event.target.value)"></td>
              <td class="num">{{ Math.round((curStu.scores[curExam]?.[s.key] || 0) / s.full * 100) }}%</td>
            </tr>
            <tr style="background:#F1E9D8">
              <td>总分</td><td class="num">{{ store.full() }}</td>
              <td class="num" style="font-weight:700">{{ store.total(curStu, curExam) }}</td>
              <td class="num">班排 {{ store.RANK[curExam]?.[curStu.id] || '-' }} · 年级 {{ store.GRADE_RANK[curExam]?.[curStu.id] || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="sc-note">暂无学生</div>
    </div>

    <!-- ④ -->
    <div class="sc-card">
      <h3>④ 真实年级数据导入</h3>
      <div class="hint">导入全年级逐人各科成绩后，年级名次改用真实经验分布计算（分数→名次），替换正态估算</div>
      <div class="sc-toolbar">
        <span style="font-weight:700">对应批次：</span>
        <van-dropdown-menu><van-dropdown-item v-model="realExam" :options="examOptions" /></van-dropdown-menu>
        <input ref="fileRef" type="file" accept=".csv,.xlsx,.xls" style="font-size:12px">
      </div>
      <textarea v-model="pasteText" placeholder="或粘贴 CSV：首行表头含 姓名,语文,数学,英语,道德与法治,历史,地理,生物,体育,总分（总分列可省略，自动求和）。每行一名全年级学生。"
        style="width:100%;min-height:90px;margin-top:8px;font-family:var(--sc-mono);font-size:12px;padding:10px;border:1.5px solid var(--sc-line);border-radius:10px;background:#fff"></textarea>
      <div class="sc-toolbar" style="margin-top:12px">
        <van-button type="primary" size="small" @click="doImport">⇪ 解析并启用真实排名</van-button>
        <van-button plain size="small" @click="downloadRealTemplate(store)">下载导入模板</van-button>
        <van-button plain size="small" @click="clearReal">✕ 清除·切回估算</van-button>
      </div>
      <div class="sc-note">{{ realStatus }}</div>
    </div>

    <!-- ⑤ -->
    <div class="sc-card">
      <h3>⑤ 班级与人数管理</h3>
      <div class="hint">新增/切换/删除班级；「学生人数」对每个班级分别生成；改班级名仅作用于当前班级</div>
      <div class="sc-toolbar">
        <van-field v-model="clsName" placeholder="当前班级名称" style="max-width:220px;border:1px solid var(--sc-line);border-radius:8px" @change="renameCls" />
        <van-button size="small" plain @click="addCls">＋ 新增班级</van-button>
        <van-button v-if="store.classes.length > 1" size="small" plain @click="delCls">✕ 删除当前班级</van-button>
      </div>
      <div class="sc-toolbar" style="margin-top:10px">
        <van-button type="primary" size="small" @click="regenAll">↻ 重新生成全部班级 mock 数据</van-button>
      </div>
      <div class="sc-note">说明：每个班级独立生成 mock 学生（禾皓轩固定在带 ★ 的班）。班级排名在本班内计算；年级排名把所有班级汇总后估算，或按导入的真实全年级数据计算。</div>
    </div>

    <!-- pickers -->
    <van-popup v-model:show="stuVisible" position="bottom" round>
      <div style="padding:8px 4px 16px;max-height:60vh;overflow:auto">
        <van-cell v-for="s in store.students" :key="s.id" :is-link="false" :title="s.name + (store.isPin(s) ? ' ★' : '')"
          :style="s.id === (curStu && curStu.id) ? 'color:var(--sc-red);font-weight:700' : ''" @click="pickStu(s.id)" />
      </div>
    </van-popup>
    <van-popup v-model:show="examVisible" position="bottom" round>
      <div style="padding:8px 4px 16px">
        <van-cell v-for="ex in store.exams" :key="ex.key" is-link :title="ex.name"
          :style="ex.key === curExam ? 'color:var(--sc-red);font-weight:700' : ''" @click="pickExam(ex.key)" />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useGradeStore } from '../stores/grade'
import { showToast } from 'vant'
import { exportDetail, downloadRealTemplate } from '../utils/exporter'
import { parseCsvText, buildRealFromRows, readFileRows } from '../utils/realImport'

const store = useGradeStore()

// ① 全局 mock 参数（本地镜像，释放滑块时提交并重生成）
const p = reactive({ ...store.params })
const busy = ref(false)
async function regen() {
  busy.value = true
  try { await store.regenerate({ ...p }); showToast('mock 数据已重新生成') }
  finally { busy.value = false }
}
function onGradeChange() { store.params.gradeSize = p.gradeSize; store.persist(); showToast('全年级人数已更新，年级名次重算') }
async function onReset() {
  busy.value = true
  try { await store.resetAll(); Object.assign(p, store.params); showToast('已恢复默认（重新拉取 mock 接口数据）') }
  finally { busy.value = false }
}

const spreadLabel = v => v < 10 ? '低' : v < 20 ? '中' : '高'
const trendLabel = v => v < 5 ? '无' : v < 12 ? '中' : '强'

// ② 满分
function onFull(key, val) { store.setSubjectFull(key, val); showToast('满分已更新，全部重算') }

// ③ 逐人精修
const curStu = computed(() => store.students.find(s => s.id === store.editStu) || store.pinStudent || store.students[0] || null)
const curExam = computed(() => store.editExam || store.lastExamKey)
const stuVisible = ref(false); const examVisible = ref(false)
function pickStu(id) { store.editStu = id; stuVisible.value = false }
function pickExam(key) { store.editExam = key; examVisible.value = false }
function onScore(subjKey, val) { if (curStu.value) store.editScore(curStu.value.id, curExam.value, subjKey, val) }
function addStu() { const id = store.addStudent(); if (id) { store.editStu = id; showToast('已新增学生') } }

// ④ 真实数据导入
const realExam = ref(store.lastExamKey)
const examOptions = computed(() => store.exams.map(e => ({ text: e.name, value: e.key })))
const pasteText = ref('')
const fileRef = ref(null)
function doImport() {
  const exam = realExam.value
  const file = fileRef.value && fileRef.value.files && fileRef.value.files[0]
  const apply = rows => {
    try {
      const parsed = buildRealFromRows(rows, store.subjects)
      store.importReal(exam, parsed)
      const ex = store.exams.find(e => e.key === exam)
      showToast(`已启用真实排名：${ex ? ex.name : exam} · ${parsed.size}人`)
    } catch (e) { showToast('解析失败：' + e) }
  }
  if (file) { readFileRows(file).then(apply).catch(err => showToast(String(err))) }
  else if (pasteText.value.trim()) apply(parseCsvText(pasteText.value))
  else showToast('请先选择文件或粘贴 CSV 数据')
}
function clearReal() {
  const exam = realExam.value
  if (store.real.byExam[exam]) { store.clearReal(exam); showToast('已清除该批次真实数据，切回估算') }
  else { store.clearReal(); showToast('已清除全部真实数据，切回估算') }
}
const realStatus = computed(() => {
  const items = store.exams.filter(ex => store.realModeOn(ex.key)).map(ex => `${ex.name}（${store.real.byExam[ex.key].size}人）`)
  return items.length ? `已启用真实年级排名：${items.join('、')}。未导入的批次仍用正态估算。` : '尚未导入真实数据，当前年级名次为「正态估算」（按全部班级汇总分布）。'
})

// ⑤ 班级
const clsName = ref(store.activeClassName)
function syncClsName() { clsName.value = store.activeClassName }
function renameCls() { const v = clsName.value.trim(); if (v) { store.renameClass(store.activeClass, v); showToast('班级已重命名') } }
function addCls() {
  const nm = '初一（' + (store.classes.length + 1) + '）班'
  const id = store.addClass(nm)
  if (id) store.regenerate().then(() => showToast('已新增并生成 ' + nm))
  clsName.value = nm
}
function delCls() { const nm = store.delClass(); if (nm) { syncClsName(); showToast('已删除 ' + nm) } }
function regenAll() { store.regenerate().then(() => showToast('已重新生成全部班级 mock 数据')) }
</script>
