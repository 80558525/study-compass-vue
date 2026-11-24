import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from '@vant/auto-import-resolver'

// 说明：接口数据全部走 mock/ 目录（VITE_USE_MOCK=true，默认）。
// 后期接真实后端：新建 .env.local 写 VITE_USE_MOCK=false 与 VITE_API_BASE=http://your-host，
// 组件与页面无需改动，src/api/grade.js 会自动改成请求真实接口。
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ imports: ['vue'] }),
    Components({ resolvers: [VantResolver({ importStyle: false })] })
  ],
  server: { host: '0.0.0.0', port: 8080 },
  preview: { host: '0.0.0.0', port: 8080 },
  build: { outDir: 'dist', assetsInlineLimit: 4096 },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true
  }
})
