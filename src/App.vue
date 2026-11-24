<template>
  <div class="sc-shell">
    <header v-if="store.authed" class="sc-header">
      <div class="sc-brand">
        <h1>学情<em>罗盘</em></h1>
        <div class="sc-sub">班级 / 年级成绩可视化分析 · 多班级 mock · 实时联动 · 一键导出 Excel</div>
      </div>
      <div class="sc-head-tools">
        <div v-if="store.authed" class="sc-user" :title="'关注学生：' + store.pinName">
          <span class="sc-user-avatar">{{ userInitial }}</span>
          <span class="sc-user-name">{{ store.pinName }}</span>
        </div>
        <button v-if="store.authed" class="sc-logout" @click="onLogout">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>退出</span>
        </button>
        <div class="sc-logo" title="学情罗盘 · Study Compass">
          <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2" />
            <circle cx="24" cy="24" r="2.4" fill="currentColor" />
            <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".7">
              <line x1="24" y1="4.5" x2="24" y2="9" /><line x1="24" y1="39" x2="24" y2="43.5" />
              <line x1="4.5" y1="24" x2="9" y2="24" /><line x1="39" y1="24" x2="43.5" y2="24" />
            </g>
            <g class="needle">
              <path d="M24 9 L28 24 L24 20.5 L20 24 Z" fill="#C0392B" />
              <path d="M24 39 L20 24 L24 27.5 L28 24 Z" fill="#1E2430" />
            </g>
          </svg>
        </div>
      </div>
    </header>

    <template v-if="store.authed">
      <ClassBar />

      <van-sticky v-if="store.classes.length" :offset-top="0">
        <nav class="sc-tabs">
          <router-link to="/dash" class="sc-tab">概览看板</router-link>
          <router-link to="/table" class="sc-tab">成绩明细 · {{ store.students.length }}人</router-link>
          <router-link to="/person" class="sc-tab">个人趋势</router-link>
          <router-link to="/compare" class="sc-tab">班级对比</router-link>
        </nav>
      </van-sticky>
    </template>

    <main>
      <van-loading v-if="store.authed && store.loading" class="sc-loading" vertical>加载数据…</van-loading>
      <router-view v-else />
    </main>

    <footer v-if="store.authed" class="sc-footer">学情罗盘 · Study Compass · 数据来自 mock 接口（mock/ 目录可改）</footer>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGradeStore } from './stores/grade'
import ClassBar from './components/ClassBar.vue'

const store = useGradeStore()
const router = useRouter()
const userInitial = computed(() => (store.pinName || '学').trim().charAt(0) || '学')
onMounted(() => store.init())
function onLogout() {
  store.logout()
  router.replace('/login')
}
</script>

<style scoped>
.sc-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 4px 16px; }
.sc-brand { min-width: 0; }
.sc-head-tools { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.sc-header .sc-logo { position: static; }
.sc-user { display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; background: var(--sc-paper-2); border: 1px solid var(--sc-line); border-radius: 999px; box-shadow: var(--sc-shadow); }
.sc-user-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--sc-red); color: #fff; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; font-family: var(--sc-serif); }
.sc-user-name { font-size: 14px; color: var(--sc-ink); font-weight: 600; max-width: 8em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-logout { display: inline-flex; align-items: center; gap: 6px; padding: 8px 15px; font-size: 14px; font-family: inherit; color: var(--sc-ink-soft); background: var(--sc-paper-2); border: 1px solid var(--sc-line); border-radius: 999px; cursor: pointer; transition: color .2s ease, border-color .2s ease, background .2s ease, transform .1s ease; }
.sc-logout:hover { color: var(--sc-red); border-color: var(--sc-red); background: rgba(192, 57, 43, .07); }
.sc-logout:active { transform: translateY(1px); }
.sc-logout svg { display: block; }
@media (max-width: 480px) {
  .sc-head-tools { gap: 8px; }
  .sc-user { padding: 4px; }
  .sc-user-name { display: none; }
  .sc-logout { padding: 8px; }
  .sc-logout span { display: none; }
  .sc-header .sc-logo { display: none; }
}
.sc-loading { padding: 60px 0; text-align: center; }
main { padding-top: 16px; }
.sc-tabs { display: flex; overflow-x: auto; background: var(--sc-paper); border-bottom: 1px solid var(--sc-line); padding: 0 16px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.sc-tabs::-webkit-scrollbar { display: none; }
.sc-tab { flex-shrink: 0; padding: 12px 14px; font-size: 14px; color: var(--sc-ink-soft); text-decoration: none; position: relative; white-space: nowrap; transition: color .2s; }
.sc-tab:hover { color: var(--sc-ink); }
.sc-tab.router-link-exact-active { color: var(--sc-red); font-weight: 700; }
.sc-tab.router-link-exact-active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 20px; height: 3px; background: var(--sc-red); border-radius: 2px; }
</style>
