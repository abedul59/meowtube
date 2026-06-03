export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase'
  ],
  supabase: {
    // 讓所有頁面預設不需要登入也能觀看（因為這是家庭劇院）
    redirect: false
  },
  app: {
    head: {
      title: '家庭劇院串流中心',
      meta: [
        { name: 'description', content: '專屬的無限容量影音庫' }
      ]
    }
  }
})