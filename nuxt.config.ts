export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://xadzdobviwceujmpxlkx.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    }
  }
})
