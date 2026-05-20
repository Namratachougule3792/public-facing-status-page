<script setup>
const props = defineProps({
  status: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'md'
  }
})

const labels = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  outage: 'Major Outage'
}

const colors = {
  operational: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  outage: 'bg-red-500/10 text-red-400 border-red-500/20'
}

const dots = {
  operational: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  outage: 'bg-red-400'
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 border rounded-full font-medium',
      colors[status],
      size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
    ]"
  >
    <span :class="['rounded-full', dots[status], size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5']" />
    {{ labels[status] }}
  </span>
</template>