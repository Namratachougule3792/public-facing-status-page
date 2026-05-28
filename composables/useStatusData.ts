import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

export const CATEGORY_ORDER = [
  'infrastructure',
  'application',
  'communication'
]

export const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: 'Infrastructure',
  application: 'Application',
  communication: 'Communication'
}

export const SERVICE_DEFINITIONS = [
  {
    id: 'kiinara-identity',
    name: 'Kiinara Identity',
    description: 'Authentication & identity',
    category: 'infrastructure',
    icon: '🔐'
  },
  {
    id: 'kiinara-core',
    name: 'Kiinara Core',
    description: 'Core platform',
    category: 'application',
    icon: '⚙️'
  },
  {
    id: 'kiinara-accounts',
    name: 'Kiinara Accounts',
    description: 'Accounts management',
    category: 'application',
    icon: '🏫'
  },
  {
    id: 'pulse-email',
    name: 'Pulse Email',
    description: 'Email service',
    category: 'communication',
    icon: '📧'
  },
  {
    id: 'pulse-whatsapp',
    name: 'Pulse WhatsApp',
    description: 'WhatsApp service',
    category: 'communication',
    icon: '💬'
  }
]

export function useStatusData() {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )

  const loading = ref(true)
  const lastChecked = ref('')
  const services = ref<any[]>([])
  const incidents = ref<any[]>([])

  const overall = computed(() => {
    const statuses = services.value.map(s => s.status)

    if (statuses.includes('outage')) {
      return 'outage'
    }

    if (statuses.includes('degraded')) {
      return 'degraded'
    }

    return 'operational'
  })

  const servicesByCategory = computed(() => {
    const grouped: Record<string, any[]> = {}

    CATEGORY_ORDER.forEach(category => {
      grouped[category] = services.value.filter(
        s => s.category === category
      )
    })

    return grouped
  })

  const fetchStatuses = async () => {
    loading.value = true

    const { data } = await supabase
      .from('dummy_service_states')
      .select('*')

    const mapped = SERVICE_DEFINITIONS.map(service => {
      const state = data?.find(
        s => s.service_id === service.id
      )

      return {
        ...service,
        status: state?.status || 'operational',
        responseTime:
          state?.status === 'operational'
            ? Math.floor(Math.random() * 100) + 50
            : 0,
        uptime:
          state?.status === 'operational'
            ? 99.99
            : state?.status === 'degraded'
            ? 97.12
            : 91.45,
        history: Array.from({ length: 90 }).map(() => {
          if (state?.status === 'outage') return 'outage'
          if (state?.status === 'degraded') return 'degraded'
          return 'operational'
        })
      }
    })

    services.value = mapped

    incidents.value = mapped
      .filter(
        s =>
          s.status === 'degraded' ||
          s.status === 'outage'
      )
      .map(service => ({
        id: service.id,
        title:
          service.status === 'outage'
            ? `${service.name} Outage`
            : `${service.name} Degraded`,
        status:
          service.status === 'outage'
            ? 'investigating'
            : 'monitoring',
        createdAt: new Date().toISOString(),
        affectedServices: [service.name]
      }))

    lastChecked.value = new Date().toLocaleTimeString()

    loading.value = false
  }

  let interval: any = null

  onMounted(async () => {
    await fetchStatuses()

    interval = setInterval(async () => {
      await fetchStatuses()
    }, 10000)
  })

  onUnmounted(() => {
    if (interval) {
      clearInterval(interval)
    }
  })

  return {
    services,
    incidents,
    overall,
    loading,
    lastChecked,
    servicesByCategory,
    refresh: fetchStatuses
  }
}