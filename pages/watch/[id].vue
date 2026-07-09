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
            @loadedmetadata="resumeProgress"
            @timeupdate="onTimeUpdate"
          >
            <source :src="`https://meowtube-api-10n0.onrender.com/stream/${movie.tg_message_id}`" type="video/mp4" />
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

        <!-- 💡 觀看紀錄控制面板 -->
        <div class="flex flex-wrap items-center gap-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
          <button @click="manualSaveProgress" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded shadow transition">
            💾 記憶觀看時間
          </button>
          <button @click="clearProgress" class="px-4 py-2 bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-white text-sm font-bold rounded shadow transition">
            🗑️ 消除記憶紀錄
          </button>
          <span v-if="actionMessage" class="text-green-400 text-sm font-bold animate-pulse">
            {{ actionMessage }}
          </span>
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
const actionMessage = ref('')

const fetchMovieData = async () => {
  try {
    loading.value = true
    const movieId = route.params.id

    // 1. 取得電影資料
    const { data, error } = await supabase.from('movies').select('*').eq('id', movieId).single()
    if (error) throw error
    movie.value = data

    // 2. 雲端優先讀取進度
    const { data: progressData } = await supabase
      .from('playback_progress')
      .select('current_time')
      .eq('video_id', movieId)
      .maybeSingle()

    if (progressData && progressData.current_time > 0) {
      savedTime.value = progressData.current_time
    } else {
      const progressKey = `progress_movie_${movieId}`
      const localProgress = localStorage.getItem(progressKey)
      if (localProgress) savedTime.value = parseFloat(localProgress)
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
// 進度控制邏輯
// ==========================================

const showMessage = (msg) => {
  actionMessage.value = msg
  setTimeout(() => { actionMessage.value = '' }, 3000)
}

const manualSaveProgress = async () => {
  if (videoPlayer.value && movie.value) {
    const currentTime = videoPlayer.value.currentTime
    
    // 寫入本機
    const progressKey = `progress_movie_${movie.value.id}`
    localStorage.setItem(progressKey, currentTime)
    savedTime.value = currentTime

    // 寫入雲端 (Upsert)
    const { error } = await supabase
      .from('playback_progress')
      .upsert({ 
        video_id: movie.value.id, 
        current_time: currentTime,
        updated_at: new Date().toISOString()
      }, { onConflict: 'video_id' })

    if (error) {
      console.error(error)
      showMessage('❌ 雲端同步失敗，僅存於本機')
    } else {
      showMessage('☁️ ✅ 觀看進度已手動儲存至雲端！')
    }
  }
}

const clearProgress = async () => {
  if (movie.value) {
    // 清除本機
    const progressKey = `progress_movie_${movie.value.id}`
    localStorage.removeItem(progressKey)
    savedTime.value = 0

    // 清除雲端
    const { error } = await supabase
      .from('playback_progress')
      .delete()
      .eq('video_id', movie.value.id)

    if (error) {
      console.error(error)
      showMessage('❌ 雲端清除失敗')
    } else {
      showMessage('🗑️ 雲端與本機的觀看紀錄已成功清除！')
    }
  }
}

const resumeProgress = () => {
  if (videoPlayer.value && savedTime.value > 0) {
    videoPlayer.value.currentTime = savedTime.value
  }
}

const onTimeUpdate = () => {
  if (videoPlayer.value && movie.value && Math.floor(videoPlayer.value.currentTime) % 5 === 0) {
    const progressKey = `progress_movie_${movie.value.id}`
    localStorage.setItem(progressKey, videoPlayer.value.currentTime)
  }
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
