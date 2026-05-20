<script setup>
defineProps({
  service: { type: Object, required: true }
})

const blockColors = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  outage: 'bg-red-500'
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-sm text-slate-300 font-medium">{{ service.name }}</span>
      <span class="text-xs text-slate-500">{{ service.uptime }}% uptime</span>
    </div>
    <div class="flex gap-px">
      <div
        v-for="(block, i) in service.history"
        :key="i"
        :class="['h-8 flex-1 rounded-sm transition-colors', blockColors[block] || 'bg-slate-800']"
        :title="`Day ${i + 1}`"
      />
    </div>
    <div class="flex justify-between text-xs text-slate-700">
      <span>90 days ago</span>
      <span>Today</span>
    </div>
  </div>
</template>