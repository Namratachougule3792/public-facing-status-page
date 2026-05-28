export default defineNuxtConfig({
  devtools: { enabled: false },

  ssr: false,

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl:
        process.env.SUPABASE_URL ||
        'https://xadzdobviwceujmpxlkx.supabase.co',

      supabaseAnonKey:
        process.env.SUPABASE_ANON_KEY || ''
    }
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  }
})