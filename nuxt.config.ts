export default defineNuxtConfig({
modules: ['@nuxtjs/tailwindcss'],

runtimeConfig: {
supabaseUrl: process.env.SUPABASE_URL,
supabaseKey: process.env.SUPABASE_KEY,

```
awsAccessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
awsSecretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
awsRegion: process.env.MY_AWS_REGION || 'ap-south-1',

public: {}
```

},

nitro: {
preset: 'aws_amplify',

```
routeRules: {
  '/api/public/**': {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  },

  '/api/**': {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
  }
}
```

},

compatibilityDate: '2025-01-01'
})
