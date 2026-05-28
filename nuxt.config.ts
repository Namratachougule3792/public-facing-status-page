export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
<<<<<<< HEAD
=======
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_ANON_KEY || ''
    }
  },
>>>>>>> 92f235f (changes added)
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
<<<<<<< HEAD
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://xadzdobviwceujmpxlkx.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    }
  }
})
=======
  ssr: false
})
>>>>>>> 92f235f (changes added)
