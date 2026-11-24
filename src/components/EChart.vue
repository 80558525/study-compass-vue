<template>
  <v-chart class="sc-ech" :option="option" autoresize :style="{ height }" />
</template>

<script setup>
// ECharts 按需注册 + vue-echarts 封装（autoresize 便于双端缩放）
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, DatasetComponent, RadarComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

// 注意：RadarChart（系列）必须配合 RadarComponent（radar 坐标系）才能渲染，缺一则雷达图空白
use([
  CanvasRenderer, BarChart, LineChart, PieChart, RadarChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, DatasetComponent, RadarComponent
])

defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '260px' }
})
</script>

<style scoped>
.sc-ech { width: 100%; }
</style>
