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
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  },
  nitro: {
    preset: 'aws_amplify',
    // Tell the server bundler not to try to bundle ws — use the installed package
    externals: {
      inline: ['ws']
    }
  },
  // Exclude supabase realtime from SSR — it's browser-only in this app
  vite: {
    optimizeDeps: {
      exclude: ['@supabase/realtime-js']
    }
  },
  compatibilityDate: '2025-01-01'
})
