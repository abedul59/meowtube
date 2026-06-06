<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    
    <div class="flex items-center gap-4 mb-6">
      <button @click="$router.back()" class="inline-flex items-center text-gray-400 hover:text-white transition-colors font-bold bg-gray-800 px-4 py-2 rounded-lg shadow">
        ⬅ 返回上一頁
      </button>
      <NuxtLink to="/" class="inline-flex items-center text-gray-500 hover:text-gray-300 transition-colors text-sm">
        🏠 回劇院大廳
      </NuxtLink>
    </div>

    <div v-if="pending" class="flex justify-center items-center h-64 text-gray-400">
      <p class="text-xl animate-pulse">🎬 載入影片資訊中...</p>
    </div>
    <div v-else-if="error || !movie" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">
      找不到這部電影。
    </div>
    <div v-else class="space-y-6 animate-fade-in">
      <h1 class="text-3xl font-bold text-white">{{ movie.title }}</h1>
      
      <div class="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video 
          ref="videoPlayer"
          controls 
          autoplay 
          class="absolute top-0 left-0 w-full h-full outline-none" 
          controlsList="nodownload"
          @timeupdate="saveProgress"
          @loadedmetadata="resumeProgress"
        >
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${movie.tg_message_id}`" type="video/mp4" />
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h2 class="text-xl font-semibold text-gray-200 mb-3">劇情簡介</h2>
        <p class="text-gray-400 leading-relaxed whitespace-pre-wrap">{{ movie.description || '無簡介' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// 取得 video 標籤的參考
const videoPlayer = ref(null)
// 建立這部電影專屬的記憶 Key
const storageKey = `meowtube_progress_movie_${route.params.id}`

const { data: movie, pending, error } = await useAsyncData(`movie-${route.params.id}`, async () => {
  const { data, error } = await supabase.from('movies').select('*').eq('id', route.params.id).single()
  if (error) throw error
  return data
})

// 💡 記憶功能：影片播放時，每秒將當前時間存入 localStorage
const saveProgress = () => {
  if (videoPlayer.value && videoPlayer.value.currentTime > 0) {
    localStorage.setItem(storageKey, videoPlayer.value.currentTime)
  }
}

// 💡 記憶功能：影片載入完成後，讀取記憶並跳轉
const resumeProgress = () => {
  const savedTime = localStorage.getItem(storageKey)
  if (savedTime && videoPlayer.value) {
    videoPlayer.value.currentTime = parseFloat(savedTime)
  }
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
