import { createClient } from '@supabase/supabase-js'
import { ref, computed, onMounted, onUnmounted } from 'vue'

const SERVICES_ORDER = [
  'kiinara-identity',
  'kiinara-core',
  'kiinara-accounts',
  'pulse-email',
  'pulse-whatsapp'
]

export function useStatusData() {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )

  const services  = ref<any[]>([])
  const incidents = ref<any[]>([])
  const overall   = ref<string>('checking')
  const loading   = ref<boolean>(true)
  const lastChecked = ref<string>(new Date().toISOString())
  let interval: ReturnType<typeof setInterval> | null = null

  // ── fetch current status for all 5 services ──────────────────────────────
  const fetchStatus = async () => {
    try {
      // 1. Get all enabled services
      const { data: serviceRows, error: svcErr } = await supabase
        .from('services')
        .select('*')
        .eq('enabled', true)
        .order('id')

      if (svcErr || !serviceRows) throw svcErr

      // 2. For each service get latest health check + last 90
      const enriched = await Promise.all(
        serviceRows.map(async (svc: any) => {
          const { data: checks } = await supabase
            .from('health_checks')
            .select('status, response_time, checked_at')
            .eq('service_id', svc.id)
            .order('checked_at', { ascending: false })
            .limit(90)

          const latest  = checks?.[0]
          const status  = latest?.status ?? 'checking'
          const history = (checks ?? []).map((c: any) => c.status).reverse()

          // Pad to 90 days
          while (history.length < 90) history.unshift('operational')

          const goodDays = history.filter((h: string) => h === 'operational').length
          const uptime   = +((goodDays / 90) * 100).toFixed(2)

          return {
            id:           svc.id,
            name:         svc.name,
            description:  svc.description,
            category:     svc.category,
            status,
            uptime,
            responseTime: latest?.response_time ?? 0,
            history,
            lastChecked:  latest?.checked_at ?? null
          }
        })
      )

      // Sort by CEO-specified order
      services.value = SERVICES_ORDER
        .map(id => enriched.find((s: any) => s.id === id))
        .filter(Boolean) as any[]

      // 3. Overall status
      if (services.value.some((s: any) => s.status === 'outage'))      overall.value = 'outage'
      else if (services.value.some((s: any) => s.status === 'degraded')) overall.value = 'degraded'
      else if (services.value.every((s: any) => s.status === 'operational')) overall.value = 'operational'
      else overall.value = 'checking'

      lastChecked.value = new Date().toISOString()

      // 4. Build incidents from last 7 days of health_checks
      await fetchIncidents()

    } catch (err) {
      console.error('fetchStatus error:', err)
      overall.value = 'checking'
    } finally {
      loading.value = false
    }
  }

  // ── build incidents from real health_checks data ──────────────────────────
  const fetchIncidents = async () => {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: logs } = await supabase
      .from('health_checks')
      .select('service_id, status, checked_at')
      .gte('checked_at', since7d)
      .order('checked_at', { ascending: true })

    if (!logs) return

    const built: any[] = []

    SERVICES_ORDER.forEach(serviceId => {
      const serviceName = services.value.find(s => s.id === serviceId)?.name ?? serviceId
      const serviceLogs = logs.filter((l: any) => l.service_id === serviceId)
      let current: any = null

      serviceLogs.forEach((log: any) => {
        const state = log.status // 'operational', 'degraded', 'outage'

        if (state !== 'operational' && !current) {
          current = {
            id:               `${serviceId}-${log.checked_at}`,
            title:            `${serviceName} ${state === 'outage' ? 'Outage' : 'Degraded Performance'}`,
            status:           state === 'outage' ? 'investigating' : 'monitoring',
            affectedServices: [serviceName],
            createdAt:        log.checked_at,
            updates: [{
              timestamp: log.checked_at,
              message:   `${serviceName} is experiencing ${state === 'outage' ? 'an outage' : 'degraded performance'}.`
            }],
            resolvedAt: null
          }
        } else if (state !== 'operational' && current) {
          if (state === 'outage') current.status = 'investigating'
        } else if (state === 'operational' && current) {
          current.status     = 'resolved'
          current.resolvedAt = log.checked_at
          current.updates.push({
            timestamp: log.checked_at,
            message:   'Service has fully recovered and is operating normally.'
          })
          built.push({ ...current })
          current = null
        }
      })

      if (current) built.push({ ...current })
    })

    incidents.value = built.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // ── grouping for display ──────────────────────────────────────────────────
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

  const categoryLabels: Record<string, string> = {
    infrastructure: 'Core Infrastructure',
    application:    'Application Services',
    communication:  'Communication',
    platform:       'Platform'
  }

  const categoryOrder = ['infrastructure', 'application', 'communication', 'platform']

  // ── dummy add/remove (no-op — managed via Supabase directly) ─────────────
  const addService    = async () => { console.log('Manage services in Supabase') }
  const removeService = async () => { console.log('Manage services in Supabase') }
  const refresh       = () => fetchStatus()

  // ── lifecycle ─────────────────────────────────────────────────────────────
  onMounted(() => {
    fetchStatus()
    interval = setInterval(fetchStatus, 10000) // poll every 10 seconds
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return {
    services,
    incidents,
    overall,
    loading,
    lastChecked,
    servicesByCategory,
    categoryLabels,
    categoryOrder,
    addService,
    removeService,
    refresh
  }
}