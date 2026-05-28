<script setup>
import { ref, computed } from 'vue'
import { useStatusData, CATEGORY_ORDER, CATEGORY_LABELS } from '~/composables/useStatusData'

const {
  services,
  overall,
  incidents,
  loading,
  lastChecked,
  error,
  servicesByCategory,
  refresh
} = useStatusData()

const showAdmin = ref(false)
const showAddModal = ref(false)

const overallConfig = {
  operational: {
    label: 'All Systems Operational',
    sub: 'All services are running normally.',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400'
  },
  degraded: {
    label: 'Partial System Degradation',
    sub: 'Some services are experiencing issues.',
    bg: 'bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400',
    text: 'text-amber-400'
  },
  outage: {
    label: 'Major Incident Ongoing',
    sub: 'We are experiencing a significant disruption.',
    bg: 'bg-red-500/10 border-red-500/20',
    dot: 'bg-red-400',
    text: 'text-red-400'
  },
  checking: {
    label: 'Checking System Status',
    sub: 'Running health checks on all services.',
    bg: 'bg-slate-500/10 border-slate-500/20',
    dot: 'bg-slate-400 animate-pulse',
    text: 'text-slate-400'
  }
}

const activeIncidents = computed(() => incidents.value.filter(i => i.status !== 'resolved'))
const resolvedIncidents = computed(() => incidents.value.filter(i => i.status === 'resolved'))

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const statusLabel = (status) => {
  if (status === 'operational') return 'Operational'
  if (status === 'degraded') return 'Degraded'
  if (status === 'outage') return 'Outage'
  return 'Checking...'
}

const dotColor = (status) => {
  if (status === 'operational') return 'bg-emerald-400'
  if (status === 'degraded') return 'bg-amber-400'
  if (status === 'outage') return 'bg-red-500'
  return 'bg-slate-500 animate-pulse'
}

const statusText = (status) => {
  if (status === 'operational') return 'text-emerald-400'
  if (status === 'degraded') return 'text-amber-400'
  if (status === 'outage') return 'text-red-400'
  return 'text-slate-500'
}

const borderColor = (status) => {
  if (status === 'degraded') return 'border-amber-500/20'
  if (status === 'outage') return 'border-red-500/20'
  return 'border-[#1e2433]'
}

const blockColor = (status) => {
  if (status === 'operational') return 'bg-emerald-500'
  if (status === 'degraded') return 'bg-amber-400'
  if (status === 'outage') return 'bg-red-500'
  return 'bg-slate-800'
}

const incidentStatusStyle = (status) => {
  if (status === 'resolved') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  if (status === 'investigating') return 'text-red-400 bg-red-500/10 border-red-500/20'
  return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
}

const incidentStatusLabel = (status) => {
  if (status === 'resolved') return 'Resolved'
  if (status === 'investigating') return 'Investigating'
  return 'Monitoring'
}

const timeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return days + 'd ago'
  if (hrs > 0) return hrs + 'h ago'
  return mins + 'm ago'
}

const formatDate = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
<div class="max-w-4xl mx-auto px-6 py-12">

  <!-- Overall Status Banner -->
  <div class="mb-10">
    <div
      v-if="!loading && overallConfig[overall]"
      :class="['border rounded-xl p-6 flex items-start gap-4', overallConfig[overall].bg]"
    >
      <div :class="['w-3 h-3 rounded-full mt-1 shrink-0', overallConfig[overall].dot]" />
      <div class="flex-1">
        <h1 :class="['text-lg font-semibold', overallConfig[overall].text]">
          {{ overallConfig[overall].label }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">{{ overallConfig[overall].sub }}</p>
        <p v-if="error" class="text-xs text-red-400 mt-1">{{ error }}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-xs text-slate-600">Last checked</p>
        <p class="text-xs text-slate-500 mt-0.5">{{ lastChecked ? formatTime(lastChecked) : '—' }}</p>
        <button @click="refresh" class="text-xs text-slate-600 hover:text-slate-400 mt-1 transition-colors">
          Refresh
        </button>
      </div>
    </div>
    <div v-if="loading" class="h-24 bg-[#141824] rounded-xl animate-pulse" />
  </div>

  <!-- Active Incidents -->
  <div v-if="activeIncidents.length > 0" class="mb-10">
    <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Active Incidents</h2>
    <div class="space-y-3">
      <div
        v-for="incident in activeIncidents"
        :key="incident.id"
        class="bg-[#141824] border border-[#1e2433] rounded-lg p-5"
      >
        <div class="flex items-start justify-between gap-4 mb-3">
          <div>
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span :class="['text-xs font-medium px-2 py-0.5 rounded border', incidentStatusStyle(incident.status)]">
                {{ incidentStatusLabel(incident.status) }}
              </span>
              <span
                v-for="svc in incident.affectedServices"
                :key="svc"
                class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
              >{{ svc }}</span>
            </div>
            <h3 class="text-sm font-semibold text-slate-200">{{ incident.title }}</h3>
          </div>
          <span class="text-xs text-slate-600 whitespace-nowrap shrink-0">{{ timeAgo(incident.createdAt) }}</span>
        </div>
        <div class="space-y-2 border-l border-[#1e2433] pl-4">
          <div v-for="update in incident.updates" :key="update.timestamp" class="relative">
            <div class="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#0f1117] border border-slate-700" />
            <p class="text-xs text-slate-600 mb-0.5">{{ formatDate(update.timestamp) }}</p>
            <p class="text-sm text-slate-400">{{ update.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Services -->
  <div class="mb-10">
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Services</h2>
      <button
        @click="showAdmin = !showAdmin"
        :class="[
          'text-xs px-3 py-1.5 rounded-lg border transition-colors',
          showAdmin
            ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
            : 'border-[#1e2433] text-slate-600 hover:text-slate-400 hover:border-slate-600'
        ]"
      >
        {{ showAdmin ? 'Done' : 'Manage Services' }}
      </button>
    </div>

    <div v-if="showAdmin" class="mb-4">
      <button
        @click="showAddModal = true"
        class="w-full border border-dashed border-[#1e2433] hover:border-blue-500/30 rounded-lg px-5 py-3 text-sm text-slate-600 hover:text-blue-400 transition-colors"
      >
        + Add New Service
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 bg-[#141824] rounded-lg animate-pulse" />
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="cat in CATEGORY_ORDER"
        :key="cat"
        v-show="servicesByCategory[cat] && servicesByCategory[cat].length > 0"
      >
        <p class="text-xs text-slate-700 uppercase tracking-widest mb-2 px-1">
          {{ CATEGORY_LABELS[cat] }}
        </p>
        <div class="space-y-2">
          <div
            v-for="service in servicesByCategory[cat]"
            :key="service.id"
            :class="['bg-[#141824] border rounded-lg px-5 py-4 flex items-center justify-between transition-colors group', borderColor(service.status)]"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div :class="['w-2 h-2 rounded-full shrink-0', dotColor(service.status)]" />
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-200 truncate">{{ service.name }}</p>
                <p class="text-xs text-slate-600 mt-0.5 truncate">{{ service.description }}</p>
              </div>
            </div>
            <div class="flex items-center gap-5 shrink-0 ml-4">
              <div class="hidden sm:block text-right">
                <p class="text-xs text-slate-600 mb-0.5">Response</p>
                <p class="text-xs font-medium text-slate-400">
                  {{ service.responseTime > 0 ? service.responseTime + 'ms' : '—' }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-600 mb-0.5">Uptime</p>
                <p class="text-xs font-medium text-slate-300">{{ service.uptime }}%</p>
              </div>
              <div class="text-right w-20">
                <p :class="['text-xs font-medium', statusText(service.status)]">
                  {{ statusLabel(service.status) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Uptime 90 Days -->
  <div class="mb-10">
    <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
      Uptime — Last 90 Days
    </h2>
    <div v-if="!loading" class="space-y-6">
      <div v-for="service in services" :key="service.id + '-uptime'" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-300 font-medium">{{ service.name }}</span>
          <span class="text-xs text-slate-500">{{ service.uptime }}% uptime</span>
        </div>
        <div class="flex gap-px">
          <div
            v-for="(block, i) in service.history"
            :key="i"
            :class="['h-8 flex-1 rounded-sm', blockColor(block)]"
            :title="'Day ' + (i + 1) + ': ' + block"
          />
        </div>
        <div class="flex justify-between text-xs text-slate-700">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Incident History -->
  <div v-if="resolvedIncidents.length > 0">
    <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
      Incident History
    </h2>
    <div class="space-y-3">
      <div
        v-for="incident in resolvedIncidents"
        :key="incident.id"
        class="bg-[#141824] border border-[#1e2433] rounded-lg p-5"
      >
        <div class="flex items-start justify-between gap-4 mb-3">
          <div>
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span :class="['text-xs font-medium px-2 py-0.5 rounded border', incidentStatusStyle(incident.status)]">
                {{ incidentStatusLabel(incident.status) }}
              </span>
              <span
                v-for="svc in incident.affectedServices"
                :key="svc"
                class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
              >{{ svc }}</span>
            </div>
            <h3 class="text-sm font-semibold text-slate-200">{{ incident.title }}</h3>
          </div>
          <span class="text-xs text-slate-600 whitespace-nowrap shrink-0">{{ timeAgo(incident.createdAt) }}</span>
        </div>
        <div class="space-y-2 border-l border-[#1e2433] pl-4">
          <div v-for="update in incident.updates" :key="update.timestamp" class="relative">
            <div class="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#0f1117] border border-slate-700" />
            <p class="text-xs text-slate-600 mb-0.5">{{ formatDate(update.timestamp) }}</p>
            <p class="text-sm text-slate-400">{{ update.message }}</p>
          </div>
        </div>
        <div v-if="incident.resolvedAt" class="mt-3 pt-3 border-t border-[#1e2433] text-xs text-slate-600">
          Resolved {{ formatDate(incident.resolvedAt) }}
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="!loading && activeIncidents.length === 0 && resolvedIncidents.length === 0"
    class="text-center py-8 text-slate-700 text-sm"
  >
    No incidents in the past 90 days
  </div>

  <!-- Add Service Modal -->
  <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="bg-[#141824] border border-[#1e2433] rounded-xl w-full max-w-md p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-slate-200">Add Service</h2>
        <button @click="showAddModal = false" class="text-slate-600 hover:text-slate-400 text-xl">&times;</button>
      </div>
      <p class="text-xs text-slate-500 mb-4">
        Services are managed via Supabase. To add a new service, insert a row into the
        <code class="bg-slate-800 px-1 rounded">services</code> table and
        <code class="bg-slate-800 px-1 rounded">dummy_service_states</code> table in your Supabase dashboard,
        then add the service ID to the SERVICE_DEFINITIONS array in
        <code class="bg-slate-800 px-1 rounded">composables/useStatusData.js</code>.
      </p>
      <button
        @click="showAddModal = false"
        class="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors"
      >
        Got it
      </button>
    </div>
  </div>

</div>
</template>