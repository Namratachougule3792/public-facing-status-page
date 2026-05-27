<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStatusData } from '~/composables/useStatusData'

const {
  services,
  overall,
  incidents,
  loading,
  lastChecked,
  refresh
} = useStatusData()

const showAdmin    = ref(false)
const showAddModal = ref(false)

const categoryOrder  = ['infrastructure', 'application', 'communication', 'platform']
const categoryLabels: Record<string, string> = {
  infrastructure: 'Core Infrastructure',
  application:    'Application Services',
  communication:  'Communication',
  platform:       'Platform'
}

const servicesByCategory = computed(() => {
  const map: Record<string, any[]> = {
    infrastructure: [],
    application:    [],
    communication:  [],
    platform:       []
  }
  services.value.forEach((s: any) => {
    if (map[s.category]) map[s.category].push(s)
    else map['application'].push(s)
  })
  return map
})

const overallConfig: Record<string, any> = {
  operational: {
    label: 'All Systems Operational',
    sub:   'All services are running normally.',
    bg:    'bg-emerald-500/10 border-emerald-500/20',
    dot:   'bg-emerald-400',
    text:  'text-emerald-400'
  },
  degraded: {
    label: 'Partial System Degradation',
    sub:   'Some services are experiencing issues. Our team is actively working on a fix.',
    bg:    'bg-amber-500/10 border-amber-500/20',
    dot:   'bg-amber-400',
    text:  'text-amber-400'
  },
  outage: {
    label: 'Major Incident Ongoing',
    sub:   'We are experiencing a significant disruption. Engineers are working to restore service.',
    bg:    'bg-red-500/10 border-red-500/20',
    dot:   'bg-red-400 animate-pulse',
    text:  'text-red-400'
  },
  checking: {
    label: 'Checking System Status',
    sub:   'Running health checks on all services, please wait.',
    bg:    'bg-slate-500/10 border-slate-500/20',
    dot:   'bg-slate-400 animate-pulse',
    text:  'text-slate-400'
  }
}

const activeIncidents   = computed(() => incidents.value.filter((i: any) => i.status !== 'resolved'))
const resolvedIncidents = computed(() => incidents.value.filter((i: any) => i.status === 'resolved'))

const formatLastChecked = (ts: string) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-12">

    <!-- Overall Status Banner -->
    <div class="mb-10">
      <div v-if="loading" class="h-24 bg-[#141824] rounded-xl animate-pulse" />
      <div
        v-else-if="overallConfig[overall]"
        :class="['border rounded-xl p-6 flex items-start gap-4', overallConfig[overall].bg]"
      >
        <div :class="['w-3 h-3 rounded-full mt-1 shrink-0', overallConfig[overall].dot]" />
        <div class="flex-1">
          <h1 :class="['text-lg font-semibold', overallConfig[overall].text]">
            {{ overallConfig[overall].label }}
          </h1>
          <p class="text-sm text-slate-500 mt-1">{{ overallConfig[overall].sub }}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-xs text-slate-600">Last checked</p>
          <p class="text-xs text-slate-500 mt-0.5">{{ formatLastChecked(lastChecked) }}</p>
          <button
            @click="refresh"
            class="text-xs text-slate-600 hover:text-slate-400 mt-1 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Active Incidents -->
    <div v-if="!loading && activeIncidents.length > 0" class="mb-10">
      <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        Active Incidents
      </h2>
      <div class="space-y-3">
        <IncidentItem
          v-for="incident in activeIncidents"
          :key="incident.id"
          :incident="incident"
        />
      </div>
    </div>

    <!-- Services -->
    <div class="mb-10">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Services
        </h2>
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
          v-for="cat in categoryOrder"
          :key="cat"
          v-show="servicesByCategory[cat]?.length > 0"
        >
          <p class="text-xs text-slate-700 uppercase tracking-widest mb-2 px-1">
            {{ categoryLabels[cat] }}
          </p>
          <div class="space-y-2">
            <ServiceCard
              v-for="service in servicesByCategory[cat]"
              :key="service.id"
              :service="service"
              :adminMode="showAdmin"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Uptime — Last 90 Days -->
    <div class="mb-10">
      <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
        Uptime — Last 90 Days
      </h2>
      <div v-if="!loading" class="space-y-6">
        <UptimeBar
          v-for="service in services"
          :key="service.id"
          :service="service"
        />
      </div>
    </div>

    <!-- Incident History -->
    <div v-if="!loading && resolvedIncidents.length > 0">
      <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        Incident History
      </h2>
      <div class="space-y-3">
        <IncidentItem
          v-for="incident in resolvedIncidents"
          :key="incident.id"
          :incident="incident"
        />
      </div>
    </div>

    <div
      v-if="!loading && resolvedIncidents.length === 0 &
