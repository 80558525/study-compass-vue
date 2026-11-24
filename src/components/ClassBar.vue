<template>
  <div class="sc-classbar">
    <span style="font-weight:700">班级</span>
    <button
      v-for="c in chips" :key="c.id"
      class="sc-cb-chip" :class="{ on: c.id === store.activeClass }"
      @click="store.setActiveClass(c.id)"
    >{{ c.name }}{{ c.pin ? ' ★' : '' }}<span class="n">{{ c.count }}</span></button>
    <van-button v-if="chips.length > 1" size="mini" plain type="default" @click="onDel">✕ 删除本班</van-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGradeStore } from '../stores/grade'
import { showDialog, showToast } from 'vant'

const store = useGradeStore()
const chips = computed(() => store.classes.map(c => ({
  id: c.id,
  name: c.name,
  pin: c.id === store.pinClass || c.pin,
  count: (store.studentsByClass[c.id] || []).length
})))

function onDel() {
  if (store.classes.length <= 1) { showToast('至少保留一个班级'); return }
  showDialog({ title: '删除班级', message: `确定删除「${store.activeClassName}」及其全部学生数据？`, showCancelButton: true })
    .then(() => {
      const nm = store.delClass()
      if (nm) showToast('已删除 ' + nm)
    }).catch(() => {})
}
</script>
