<template>
  <!-- 採用純黑背景與暗紅色調，營造私密無痕的氛圍 -->
  <div class="min-h-screen bg-black text-gray-300 p-4 md:p-8 font-sans">
    
    <!-- 驗證中畫面 -->
    <div v-if="isAuthenticating" class="flex justify-center items-center h-screen">
      <div class="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="max-w-7xl mx-auto animate-fade-in">
      
      <!-- 頂部導覽列 -->
      <div class="flex justify-between items-center mb-10 pb-4 border-b border-red-900/50">
        <h1 class="text-3xl font-extrabold text-red-600 tracking-wider flex items-center gap-2">
          <span>🔞 私密影音特區</span>
        </h1>
        <div class="flex gap-4">
          <button @click="$router.push('/admin')" class="text-gray-400 hover:text-white transition font-bold bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 shadow-sm">
            ⚙️ 上傳後台
          </button>
          <button @click="logout" class="bg-red-900/30 border border-red-800 hover:bg-red-800 hover:text-white px-4 py-2 rounded text-red-500 transition font-bold">
            登出並離開
          </button>
        </div>
      </div>

      <!-- 載入中狀態 -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else class="space-y-12">
        
        <!-- 私密電影區塊 -->
        <section v-if="movies.length > 0">
          <h2 class="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2 border-l-4 border-red-600 pl-3">
            獨立私密影片
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div 
              v-for="movie in movies" 
              :key="movie.id"
              @click="$router.push(`/secret-zone/watch/${movie.id}`)"
              class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer group hover:border-red-600 transition-all shadow-lg hover:shadow-red-900/20"
            >
              <div class="aspect-video bg-black relative flex justify-center items-center">
                <span class="text-4xl group-hover:scale-110 transition-transform duration-300">🎬</span>
                <!-- 進度條標記 (若有) -->
                <div class="absolute bottom-0 left-0 h-1 bg-red-600 w-full opacity-50"></div>
              </div>
              <div class="p-4">
                <h3 class="font-bold text-lg text-gray-100 truncate group-hover:text-red-400 transition">{{ movie.title }}</h3>
                <p class="text-xs text-gray-500 mt-2 line-clamp-2">{{ movie.description || '無詳細描述' }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 私密影集區塊 -->
        <section v-if="series.length > 0">
          <h2 class="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2 border-l-4 border-red-600 pl-3">
            私密影集系列
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="item in series" 
              :key="item.id"
              @click="$router.push(`/secret-zone/series/${item.id}`)"
              class="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer group hover:border-red-600 transition-all shadow-lg hover:shadow-red-900/20 flex flex-col justify-between h-full"
            >
              <div>
                <h3 class="font-bold text-xl text-gray-100 group-hover:text-red-400 transition mb-2">{{ item.title }}</h3>
                <p class="text-sm text-gray-500 line-clamp-3">{{ item.description || '無詳細描述' }}</p>
              </div>
              <div class="mt-4 flex justify-between items-center text-xs font-bold">
                <span class="text-gray-400 bg-gray-800 px-2 py-1 rounded">📺 影集系列</span>
                <span class="text-red-500 group-hover:translate-x-1 transition-transform">查看集數 ➔</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 空狀態 -->
        <div v-if="movies.length === 0 && series.length === 0" class="text-center py-20 bg-gray-900/50 rounded-xl border border-gray-800/50">
          <span class="text-5xl mb-4 block">📭</span>
          <p class="text-gray-400 text-lg">目前私密片庫中沒有任何影片。</p>
          <button @click="$router.push('/admin')" class="mt-4 text-red-500 hover:text-red-400 font-bold underline underline-offset-4">
            前往上傳
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const supabase = useSupabaseClient()

const isAuthenticating = ref(true)
const loading = ref(true)
const movies = ref([])
const series = ref([])

// 離開並清除權限
const logout = () => {
  sessionStorage.removeItem('secret_auth')
  router.push('/')
}

const fetchData = async () => {
  try {
    // 讀取獨立的私密資料表
    const [moviesResponse, seriesResponse] = await Promise.all([
      supabase.from('secret_movies').select('*').order('created_at', { ascending: false }),
      supabase.from('secret_series').select('*').order('created_at', { ascending: false })
    ])

    if (moviesResponse.error) throw moviesResponse.error
    if (seriesResponse.error) throw seriesResponse.error

    movies.value = moviesResponse.data || []
    series.value = seriesResponse.data || []
  } catch (error) {
    console.error('無法讀取私密資料庫:', error.message)
    alert('資料讀取失敗，請確認 Supabase 中已建立 secret_movies 與 secret_series 資料表。')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 客戶端權限防護：檢查是否有正確的授權標記
  const auth = sessionStorage.getItem('secret_auth')
  if (auth !== 'granted') {
    alert('🛑 未經授權的存取，請從後台輸入密碼登入。')
    router.push('/')
    return
  }
  
  isAuthenticating.value = false
  fetchData()
})
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}
</style>
