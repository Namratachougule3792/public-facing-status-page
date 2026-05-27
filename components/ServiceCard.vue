<script setup>
defineProps({
  service:   { type: Object,  required: true },
  adminMode: { type: Boolean, default: false }
})

const dotColor = {
  operational: 'bg-emerald-400',
  degraded:    'bg-amber-400',
  outage:      'bg-red-500',
  checking:    'bg-slate-500 animate-pulse'
}

const borderColor = {
  operational: 'border-[#1e2433] hover:border-emerald-500/20',
  degraded:    'border-amber-500/20',
  outage:      'border-red-500/20',
  checking:    'border-[#1e2433]'
}

const statusLabel = {
  operational: 'Operational',
  degraded:    'Degraded',
  outage:      'Outage',
  checking:    'Checking...'
}

const statusText = {
  operational: 'text-emerald-400',
  degraded:    'text-amber-400',
  outage:      'text-red-400',
  checking:    'text-slate-500'
}
</script>

<template>
  <div
    :class="[
      'bg-[#141824] border rounded-lg px-5 py-4 flex items-center justify-between transition-colors group',
      borderColor[service.status] || 'border-[#1e2433]'
    ]"
  >
    <!-- Left: icon + dot + name + description -->
    <div class="flex items-center gap-3 min-w-0">
      <span v-if="service.icon" class="text-base shrink-0">{{ service.icon }}</span>
      <div :class="['w-2 h-2 rounded-full shrink-0', dotColor[service.status] || 'bg-slate-500']" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-200 truncate">{{ service.name }}</p>
        <p class="text-xs text-slate-600 mt-0.5 truncate">{{ service.description }}</p>
      </div>
    </div>

    <!-- Right: response + uptime + status label -->
    <div class="flex items-center gap-5 shrink-0 ml-4">
      <div class="hidden sm:block text-right">
        <p class="text-xs text-slate-600 mb-0.5">Response</p>
        <p class="text-xs font-medium text-slate-400">
          {{ service.responseTime && service.responseTime > 0 ? service.responseTime + 'ms' : '—' }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs text-slate-600 mb-0.5">Uptime</p>
        <p class="text-xs font-medium text-slate-300">{{ service.uptime }}%</p>
      </div>
      <div class="text-right w-24">
        <p :class="['text-xs font-medium', statusText[service.status] || 'text-slate-400']">
          {{ statusLabel[service.status] || service.status }}
        </p>
      </div>
      <!-- Remove button shown only in admin mode -->
      <button
        v-if="adminMode"
        class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 hover:text-red-400 text-base leading-none ml-1"
        title="Managed via Simulator"
        disabled
      >
        &times;
      </button>
    </div>
  </div>
</template>
