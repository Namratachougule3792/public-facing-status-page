// plugins/supabase.client.ts
// The .client suffix means this NEVER runs on the server (Node.js)
// It only runs in the browser where WebSocket is native

import { createClient } from '@supabase/supabase-js'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string
  )

  return {
    provide: {
      supabase
    }
  }
})
