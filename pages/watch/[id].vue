<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
      <button @click="$router.back()" class="mb-6 inline-flex items-center text-gray-400 hover:text-white transition font-bold bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm">
        ⬅ 返回上一頁
      </button>

      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="movie" class="space-y-6 animate-fade-in">
        
        <div class="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
          <video 
            ref="videoPlayer"
            controls 
            autoplay 
            crossorigin="anonymous"
            class="absolute top-0 left-0 w-full h-full outline-none" 
            controlsList="nodownload"
            @canplay="resumeProgress"
            @pause="syncProgressToDB"
            @timeupdate="onTimeUpdate"
          >
            <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${movie.tg_message_id}`" type="video/mp4" />
            
            <track 
              v-for="(sub, index) in movie.subtitles" 
              :key="index"
              :src="sub.url" 
              kind="subtitles" 
              :srclang="sub.srclang" 
              :label="sub.label" 
              :default="sub.default" 
            />
          </video>
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <h1 class="text-3xl md:text-4xl font-bold text-white">
              {{ movie.title }}
            </h1>
            
            <span v-if="movie.subtitles && movie.subtitles.length > 0" class="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs font-bold rounded border border-gray-600 shadow-sm flex items-center">
              CC ({{ movie.subtitles.length }} 語言)
            </span>
            <span v-else class="px-2 py-0.5 bg-gray-800 text-gray-500 text-xs font-bold rounded border border-gray-700 shadow-sm flex items-center">
              內建字幕 / 無外掛
            </span>
          </div>
          
          <p v-if="movie.description" class="text-gray-400 text-base leading-relaxed bg-gray-800/50 p-5 rounded-lg border border-gray-700/50">
            {{ movie.description }}
          </p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const supabase = useSupabaseClient()

const loading = ref(true)
const movie = ref(null)
const videoPlayer = ref(null)
const savedTime = ref(0)

// 載入電影資料
const fetchMovieData = async () => {
  try {
    loading.value = true
    const movieId = route.params.id

    // 1. 取得獨立電影資訊
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()

    if (error) throw error
    movie.value = data

    // 2. 讀取本機觀看進度 (使用專屬的 key 避免跟影集衝突)
    const progressKey = `progress_movie_${movieId}`
    const localProgress = localStorage.getItem(progressKey)
    if (localProgress) {
      savedTime.value = parseFloat(localProgress)
    }

  } catch (err) {
    console.error('載入失敗:', err.message)
    alert('無法載入電影資訊')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMovieData()
})

// ==========================================
// 播放器控制邏輯
// ==========================================

// 影片準備好時：恢復上次觀看進度
const resumeProgress = () => {
  if (videoPlayer.value && savedTime.value > 0 && videoPlayer.value.currentTime < 1) {
    videoPlayer.value.currentTime = savedTime.value
  }
}

// 影片播放中：每秒記錄進度至 LocalStorage
const onTimeUpdate = () => {
  if (videoPlayer.value && movie.value) {
    const progressKey = `progress_movie_${movie.value.id}`
    localStorage.setItem(progressKey, videoPlayer.value.currentTime)
  }
}

// 影片暫停時：(保留未來擴充同步至 Supabase DB 的接口)
const syncProgressToDB = () => {
  if (!videoPlayer.value || !movie.value) return
  // await supabase.from('user_profiles').update({ ... }) 
}
</script>

<style scoped>
.animate-fade-in { 
  animation: fadeIn 0.3s ease-out; 
}

@keyframes fadeIn { 
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  } 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}
</style>
