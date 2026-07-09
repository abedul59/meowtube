<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- 返回按鈕 -->
      <button @click="$router.back()" class="mb-6 inline-flex items-center text-gray-400 hover:text-white transition font-bold bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm">
        ⬅ 返回上一頁
      </button>

      <!-- 載入中狀態 -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- 影片內容區塊 -->
      <div v-else-if="episode" class="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <!-- 左側：影片播放器與主資訊 -->
        <div class="xl:col-span-2 space-y-6">
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
              @ended="playNextEpisode"
            >
              <source :src="`https://meowtube-api-10n0.onrender.com/stream/${episode.tg_message_id}`" type="video/mp4" />
              <track 
                v-for="(sub, index) in episode.subtitles" 
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
            <button @click="manualSaveProgress" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded shadow transition">
              💾 記憶觀看時間
            </button>
            <button @click="clearProgress" class="px-4 py-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white text-sm font-bold rounded shadow transition">
              🗑️ 消除記憶紀錄
            </button>
            <span v-if="actionMessage" class="text-green-400 text-sm font-bold animate-pulse">
              {{ actionMessage }}
            </span>
          </div>

          <div>
            <h2 class="text-indigo-400 font-bold mb-1 text-lg">{{ episode.series?.title || '未知影集' }}</h2>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl md:text-3xl font-bold text-white">
                第 {{ episode.season }} 季 第 {{ episode.episode }} 集
                <span v-if="episode.title" class="text-gray-400 ml-2 text-xl">- {{ episode.title }}</span>
              </h1>
              <span v-if="episode.subtitles && episode.subtitles.length > 0" class="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs font-bold rounded border border-gray-600 shadow-sm flex items-center">
                CC ({{ episode.subtitles.length }} 語言)
              </span>
              <span v-else class="px-2 py-0.5 bg-gray-800 text-gray-500 text-xs font-bold rounded border border-gray-700 shadow-sm flex items-center">
                內建字幕 / 無外掛
              </span>
            </div>
            <p v-if="episode.series?.description" class="mt-4 text-gray-400 text-sm leading-relaxed bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              {{ episode.series.description }}
            </p>
          </div>
        </div>

        <!-- 右側：同季選集清單 -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-[500px] xl:h-auto max-h-[700px]">
          <div class="p-4 border-b border-gray-700 bg-gray-800/80 rounded-t-xl sticky top-0">
            <h3 class="text-lg font-bold text-white">選集清單 (第 {{ episode.season }} 季)</h3>
          </div>
          
          <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <button 
              v-for="ep in seriesEpisodes" 
              :key="ep.id"
              @click="goToEpisode(ep.id)"
              :class="[
                'w-full text-left p-3 rounded-lg transition flex items-center gap-3 border',
                ep.id === episode.id 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                  : 'bg-gray-900 border-gray-700 hover:border-gray-500 text-gray-300 hover:bg-gray-700'
              ]"
            >
              <span class="w-14 text-center font-bold text-sm" :class="ep.id === episode.id ? 'text-indigo-200' : 'text-gray-500'">
                EP {{ ep.episode }}
              </span>
              <span class="flex-1 truncate font-medium">{{ ep.title || `第 ${ep.episode} 集` }}</span>
              <span v-if="ep.subtitles && ep.subtitles.length > 0" class="text-[10px] bg-gray-700 px-1 rounded text-gray-400">CC</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const loading = ref(true)
const episode = ref(null)
const seriesEpisodes = ref([])
const videoPlayer = ref(null)
const savedTime = ref(0)
const actionMessage = ref('')

const fetchEpisodeData = async () => {
  try {
    loading.value = true
    const epId = route.params.id

    // 1. 取得影片與影集資訊
    const { data: epData, error: epError } = await supabase.from('episodes').select('*, series(*)').eq('id', epId).single()
    if (epError) throw epError
    episode.value = epData

    // 2. 取得同季選單
    if (epData.series_id) {
      const { data: listData } = await supabase.from('episodes').select('id, season, episode, title, subtitles').eq('series_id', epData.series_id).eq('season', epData.season).order('episode', { ascending: true })
      if (listData) seriesEpisodes.value = listData
    }

    // 3. 雲端優先讀取進度 (從 playback_progress 表)
    // 使用 maybeSingle() 避免第一觀看時找不到資料而報錯
    const { data: progressData } = await supabase
      .from('playback_progress')
      .select('current_time')
      .eq('video_id', epId)
      .maybeSingle()

    if (progressData && progressData.current_time > 0) {
      savedTime.value = progressData.current_time
    } else {
      const progressKey = `progress_ep_${epId}`
      const localProgress = localStorage.getItem(progressKey)
      if (localProgress) savedTime.value = parseFloat(localProgress)
    }

  } catch (err) {
    console.error('載入失敗:', err.message)
    alert('無法載入影片資訊')
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, () => {
  fetchEpisodeData()
})

onMounted(() => {
  fetchEpisodeData()
})

// ==========================================
// 進度控制邏輯
// ==========================================

const showMessage = (msg) => {
  actionMessage.value = msg
  setTimeout(() => { actionMessage.value = '' }, 3000)
}

const manualSaveProgress = async () => {
  if (videoPlayer.value && episode.value) {
    const currentTime = videoPlayer.value.currentTime
    
    // 寫入本機
    const progressKey = `progress_ep_${episode.value.id}`
    localStorage.setItem(progressKey, currentTime)
    savedTime.value = currentTime

    // 寫入雲端 (Upsert)
    const { error } = await supabase
      .from('playback_progress')
      .upsert({ 
        video_id: episode.value.id, 
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
  if (episode.value) {
    // 清除本機
    const progressKey = `progress_ep_${episode.value.id}`
    localStorage.removeItem(progressKey)
    savedTime.value = 0

    // 清除雲端
    const { error } = await supabase
      .from('playback_progress')
      .delete()
      .eq('video_id', episode.value.id)

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
  if (videoPlayer.value && episode.value && Math.floor(videoPlayer.value.currentTime) % 5 === 0) {
    const progressKey = `progress_ep_${episode.value.id}`
    localStorage.setItem(progressKey, videoPlayer.value.currentTime)
  }
}

const goToEpisode = (targetId) => {
  if (targetId === episode.value.id) return
  router.push(`/watch/ep/${targetId}`)
}

const playNextEpisode = () => {
  const currentIndex = seriesEpisodes.value.findIndex(ep => ep.id === episode.value.id)
  if (currentIndex !== -1 && currentIndex + 1 < seriesEpisodes.value.length) {
    const nextEp = seriesEpisodes.value[currentIndex + 1]
    goToEpisode(nextEp.id)
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.3); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.6); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(79, 70, 229, 1); }
</style>
