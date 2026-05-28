export default defineNuxtConfig({
  ssr: false,

  devtools: {
    enabled: false
  },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_ANON_KEY || ''
    }
  },

  compatibilityDate: '2025-01-01'
})