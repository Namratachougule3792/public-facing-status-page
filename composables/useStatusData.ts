import { ref, computed, onMounted, onUnmounted } from 'vue'

export const SERVICE_DEFINITIONS = [
  { id: 'kiinara-identity',  name: 'Kiinara Identity',  description: 'Authentication & user identity', category: 'infrastructure', icon: '🔐' },
  { id: 'kiinara-core',      name: 'Kiinara Core',      description: 'Core platform services',         category: 'application',    icon: '⚙️' },
  { id: 'kiinara-accounts',  name: 'Kiinara Accounts',  description: 'Accounts management',            category: 'application',    icon: '🏫' },
  { id: 'pulse-email',       name: 'Pulse — Email',     description: 'Email delivery service',         category: 'communication',  icon: '📧' },
  { id: 'pulse-whatsapp',    name: 'Pulse — WhatsApp',  description: 'WhatsApp messaging service',     category: 'communication',  icon: '💬' }
]

const STATUS_MAP: Record<string, string> = {
  healthy:  'operational',
  degraded: 'degraded',
  outage:   'outage'
}

export function useStatusData() {
  const config = useRuntimeConfig()

  const serviceStates = ref<Record<string, string>>(
    Object.fromEntries(SERVICE_DEFINITIONS.map(s => [s.id, 'operational']))
  )
  const recentChecks = ref<any[]>([])
  const loading = ref(true)
  const lastChecked = ref(new Date().toISOString())

  // supabase client is created lazily inside onMounted — never on server
  let supabase: any = null
  let realtimeChannel: any = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------
  const services = computed(() =>
    SERVICE_DEFINITIONS.map(def => {
      const currentStatus = serviceStates.value[def.id] || 'operational'
      const history = buildHistory(def.id, recentChecks.value)
      const goodSlots = history.filter(h => h === 'operational').length
      const uptime = history.length > 0 ? +((goodSlots / history.length) * 100).toFixed(2) : 100
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        status: currentStatus,
        uptime,
        history
      }
    })
  )

  const overall = computed(() => {
    const statuses = Object.values(serviceStates.value)
    if (statuses.some(s => s === 'outage'))   return 'outage'
    if (statuses.some(s => s === 'degraded')) return 'degraded'
    return 'operational'
  })

  const incidents = computed(() => buildIncidents(recentChecks.value))

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  async function loadCurrentStates() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('dummy_service_states')
      .select('service_name, status, updated_at')

    if (error) { console.error('loadCurrentStates error:', error.message); return }

    if (data) {
      data.forEach((row: any) => {
        serviceStates.value[row.service_name] = STATUS_MAP[row.status] || 'operational'
      })
      if (data.length > 0) {
        const latest = data.reduce((a: any, b: any) =>
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        )
        lastChecked.value = latest.updated_at
      }
    }
  }

  async function loadRecentChecks() {
    if (!supabase) return
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('health_checks')
      .select('service_name, status, checked_at')
      .gte('checked_at', since)
      .order('checked_at', { ascending: true })

    if (error) { console.error('loadRecentChecks error:', error.message); return }
    recentChecks.value = data || []
  }

  // -------------------------------------------------------------------------
  // Realtime — only runs in browser, never on server
  // -------------------------------------------------------------------------
  function subscribeToRealtime() {
    if (!supabase) return

    realtimeChannel = supabase
      .channel('status_page_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dummy_service_states' },
        (payload: any) => {
          const row = payload.new
          if (row?.service_name) {
            serviceStates.value[row.service_name] = STATUS_MAP[row.status] || 'operational'
            lastChecked.value = new Date().toISOString()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'health_checks' },
        (payload: any) => {
          const row = payload.new
          if (row) recentChecks.value = [...recentChecks.value, row]
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected')
        }
      })
  }

  function startPolling() {
    pollInterval = setInterval(async () => {
      await loadCurrentStates()
    }, 10000)
  }

  // -------------------------------------------------------------------------
  // Lifecycle — createClient ONLY inside onMounted (browser only)
  // -------------------------------------------------------------------------
  onMounted(async () => {
    // Dynamic import so this code path never executes on the server
    const { createClient } = await import('@supabase/supabase-js')

    supabase = createClient(
      config.public.supabaseUrl as string,
      config.public.supabaseAnonKey as string,
      {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    )

    await Promise.all([loadCurrentStates(), loadRecentChecks()])
    loading.value = false
    subscribeToRealtime()
    startPolling()
  })

  onUnmounted(() => {
    if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel)
    if (pollInterval) clearInterval(pollInterval)
  })

  const refresh = async () => {
    loading.value = true
    await Promise.all([loadCurrentStates(), loadRecentChecks()])
    loading.value = false
  }

  return { services, overall, incidents, loading, lastChecked, refresh }
}

// ---------------------------------------------------------------------------
// Build 90-slot uptime history
// ---------------------------------------------------------------------------
function buildHistory(serviceId: string, checks: any[]): ('operational' | 'degraded' | 'outage')[] {
  const serviceChecks = checks.filter(c => c.service_name === serviceId)
  const byDay: Record<string, { total: number; errors: number; degraded: number }> = {}
  serviceChecks.forEach(c => {
    const day = (c.checked_at || '').split('T')[0]
    if (!day) return
    if (!byDay[day]) byDay[day] = { total: 0, errors: 0, degraded: 0 }
    byDay[day].total++
    if (c.status === 'outage')   byDay[day].errors++
    if (c.status === 'degraded') byDay[day].degraded++
  })

  const history: ('operational' | 'degraded' | 'outage')[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const day = byDay[key]
    if (!day || day.total === 0) {
      history.push('operational')
    } else if (day.errors / day.total >= 0.5) {
      history.push('outage')
    } else if (day.degraded > 0 || day.errors > 0) {
      history.push('degraded')
    } else {
      history.push('operational')
    }
  }
  return history
}

// ---------------------------------------------------------------------------
// Build incidents from health_checks
// ---------------------------------------------------------------------------
function buildIncidents(checks: any[]) {
  const incidents: any[] = []
  const nameMap: Record<string, string> = {
    'kiinara-identity': 'Kiinara Identity',
    'kiinara-core':     'Kiinara Core',
    'kiinara-accounts': 'Kiinara Accounts',
    'pulse-email':      'Pulse — Email',
    'pulse-whatsapp':   'Pulse — WhatsApp'
  }

  Object.keys(nameMap).forEach(serviceId => {
    const serviceLogs = checks
      .filter(c => c.service_name === serviceId)
      .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())

    if (serviceLogs.length === 0) return

    const buckets: Record<string, { total: number; errors: number; degraded: number; time: string }> = {}
    serviceLogs.forEach(l => {
      const d = new Date(l.checked_at)
      d.setSeconds(0, 0)
      d.setMinutes(Math.floor(d.getMinutes() / 5) * 5)
      const key = d.toISOString()
      if (!buckets[key]) buckets[key] = { total: 0, errors: 0, degraded: 0, time: l.checked_at }
      buckets[key].total++
      if (l.status === 'outage')   buckets[key].errors++
      if (l.status === 'degraded') buckets[key].degraded++
    })

    let current: any = null
    Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([, b]) => {
        const outageRate = b.total > 0 ? b.errors / b.total : 0
        let state = 'operational'
        if (outageRate >= 0.5) state = 'outage'
        else if (b.degraded > 0 || b.errors > 0) state = 'degraded'

        if (state !== 'operational' && !current) {
          current = {
            id: `${serviceId}-${b.time}`,
            title: `${nameMap[serviceId]} ${state === 'outage' ? 'Outage' : 'Degraded Performance'}`,
            status: state === 'outage' ? 'investigating' : 'monitoring',
            affectedServices: [nameMap[serviceId]],
            createdAt: b.time,
            resolvedAt: null,
            updates: [{
              timestamp: b.time,
              message: `${nameMap[serviceId]} is experiencing ${state === 'outage' ? 'an outage' : 'degraded performance'}. We are investigating.`
            }]
          }
        } else if (state !== 'operational' && current) {
          if (state === 'outage') current.status = 'investigating'
        } else if (state === 'operational' && current) {
          current.status = 'resolved'
          current.resolvedAt = b.time
          current.updates.push({
            timestamp: b.time,
            message: 'Service has fully recovered and is operating normally.'
          })
          incidents.push({ ...current })
          current = null
        }
      })

    if (current) incidents.push({ ...current })
  })

  return incidents.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
