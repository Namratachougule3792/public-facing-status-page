<script setup>
defineProps({
  incident: { type: Object, required: true }
})

const statusStyles = {
  investigating: 'text-red-400 bg-red-500/10 border-red-500/20',
  identified: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  monitoring: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
}

const statusLabels = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved'
}

const formatDate = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  return `${mins}m ago`
}
</script>

<template>
  <div class="bg-[#141824] border border-[#1e2433] rounded-lg p-5">
    <div class="flex items-start justify-between gap-4 mb-3">
      <div>
        <div class="flex items-center gap-2 mb-1.5 flex-wrap">
          <span :class="['text-xs font-medium px-2 py-0.5 rounded border', statusStyles[incident.status]]">
            {{ statusLabels[incident.status] }}
          </span>
          <span
            v-for="svc in incident.affectedServices"
            :key="svc"
            class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
          >
            {{ svc }}
          </span>
        </div>
        <h3 class="text-sm font-semibold text-slate-200">{{ incident.title }}</h3>
      </div>
      <span class="text-xs text-slate-600 whitespace-nowrap shrink-0">
        {{ timeAgo(incident.createdAt) }}
      </span>
    </div>

    <div class="space-y-3 mt-4 border-l border-[#1e2433] pl-4">
      <div v-for="update in incident.updates" :key="update.timestamp" class="relative">
        <div class="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#0f1117] border border-slate-700" />
        <p class="text-xs text-slate-600 mb-1">{{ formatDate(update.timestamp) }}</p>
        <p class="text-sm text-slate-400 leading-relaxed">{{ update.message }}</p>
      </div>
    </div>

    <div v-if="incident.resolvedAt" class="mt-4 pt-3 border-t border-[#1e2433] text-xs text-slate-600">
      Resolved on {{ formatDate(incident.resolvedAt) }}
    </div>
  </div>
</template>