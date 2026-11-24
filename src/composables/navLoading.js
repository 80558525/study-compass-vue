// src/composables/navLoading.js —— 全局路由跳转 loading 状态
// 模块级单例 ref：router 守卫写入，App.vue 读取渲染遮罩。
import { ref } from 'vue'

export const navLoading = ref(false)

export function startNav() { navLoading.value = true }
export function endNav() { navLoading.value = false }
