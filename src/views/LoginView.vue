<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">
        <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2" />
          <circle cx="24" cy="24" r="2.4" fill="currentColor" />
          <g class="needle">
            <path d="M24 9 L28 24 L24 20.5 L20 24 Z" fill="#C0392B" />
            <path d="M24 39 L20 24 L24 27.5 L28 24 Z" fill="#1E2430" />
          </g>
        </svg>
        <h2>学情<em>罗盘</em></h2>
      </div>
      <p class="login-sub">登录后进入成绩可视化分析。学生姓名将作为本机的“关注学生”，用于各视图置顶与个人趋势默认。</p>

      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.user"
            label="账号"
            placeholder="默认 admin"
            autocomplete="username"
          />
          <van-field
            v-model="form.pass"
            type="password"
            label="密码"
            placeholder="默认 admin"
            autocomplete="current-password"
            :error-message="credError"
          />
          <van-field
            v-model="form.name"
            label="学生姓名"
            placeholder="请输入学生姓名"
            :error-message="nameError"
          />
        </van-cell-group>
        <div class="login-actions">
          <van-button block type="primary" native-type="submit" :loading="busy">进入看板</van-button>
        </div>
      </van-form>

      <div class="login-hint">提示：学生姓名需与成绩名单完全一致，否则会提示“学生不存在”并停留在本页。</div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useGradeStore } from '../stores/grade'

const store = useGradeStore()
const router = useRouter()
const form = reactive({ user: 'admin', pass: 'admin', name: '' })
const busy = ref(false)
const credError = ref('')
const nameError = ref('')

async function onSubmit() {
  busy.value = true
  credError.value = ''
  nameError.value = ''
  const res = await store.login(form.user, form.pass, form.name)
  busy.value = false
  if (res.ok) {
    showToast({ message: `欢迎，${res.student.name}`, type: 'success' })
    router.replace('/dash')
  } else if (res.error === '学生不存在') {
    nameError.value = '学生不存在'
    showToast('学生不存在，请检查姓名')
  } else {
    credError.value = res.error
    showToast(res.error)
  }
}
</script>

<style scoped>
.login-wrap { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 120px); padding: 24px 16px; }
.login-card { width: 100%; max-width: 420px; background: var(--sc-paper); border: 1px solid var(--sc-line); border-radius: 16px; padding: 28px 20px; box-shadow: 0 8px 30px rgba(0, 0, 0, .06); }
.login-brand { display: flex; align-items: center; gap: 12px; color: var(--sc-ink); }
.login-brand h2 { margin: 0; font-size: 24px; letter-spacing: 1px; }
.login-brand h2 em { color: var(--sc-red); font-style: normal; }
.login-sub { margin: 14px 0 20px; font-size: 13px; line-height: 1.6; color: var(--sc-ink-soft); }
.login-actions { margin-top: 20px; padding: 0 4px; }
.login-hint { margin-top: 18px; font-size: 12px; line-height: 1.6; color: var(--sc-ink-soft); background: rgba(0, 0, 0, .03); border-radius: 8px; padding: 10px 12px; }
</style>
