<template>
  <div>
    <h1 class="text-3xl font-bold mb-8 text-red-500">最新上架</h1>
    
    <div v-if="pending" class="text-gray-400 flex items-center justify-center h-64">
      <p class="text-xl">🎬 載入電影庫中...</p>
    </div>

    <div v-else-if="error" class="text-red-500 p-4 bg-red-900/20 rounded-lg">
      無法讀取資料庫：{{ error.message }}
    </div>

    <div v-else-if="!movies || movies.length === 0" class="text-gray-400">
      目前尚未上傳任何電影，快去後台新增吧！
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
      <div 
        v-for="movie in movies" 
        :key="movie.id" 
        class="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer flex flex-col border border-gray-700 hover:border-red-500"
        @click="goToWatch(movie.id)"
      >
        <div class="h-64 md:h-72 bg-gray-900 relative">
          <img 
            v-if="movie.cover_url" 
            :src="movie.cover_url" 
            :alt="movie.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
            無海報
          </div>
        </div>
        
        <div class="p-4 flex-1 flex flex-col justify-between bg-gradient-to-t from-gray-900 to-gray-800">
          <div>
            <h2 class="text-lg font-bold text-gray-100 truncate" :title="movie.title">
              {{ movie.title }}
            </h2>
            <p class="text-sm text-gray-400 mt-2 line-clamp-2" :title="movie.description">
              {{ movie.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
// 取得 Supabase 客戶端實例
const supabase = useSupabaseClient()

// 使用 useAsyncData 來抓取資料，確保換頁與 SSR 體驗順暢
const { data: movies, pending, error } = await useAsyncData('movies-list', async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, description, cover_url')
    .order('created_at', { ascending: false }) // 將最新加入的電影排在最前面

  if (error) {
    console.error('Supabase 讀取錯誤:', error)
    throw error
  }
  
  return data
})

// 點擊卡片後導向觀看頁面
const goToWatch = (id) => {
  router.push(`/watch/${id}`)
}
</script>