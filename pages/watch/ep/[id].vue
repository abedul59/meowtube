<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <button @click="$router.back()" class="mb-6 inline-flex items-center text-gray-400 hover:text-white transition font-bold bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm">
        ⬅ 返回上一頁
      </button>

      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="episode" class="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <div class="xl:col-span-2 space-y-6">
          
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
              @ended="playNextEpisode"
            >
              <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${episode.tg_message_id}`" type="video/mp4" />
              
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

// 載入該集資料與選集列表
const fetchEpisodeData = async () => {
  try {
    loading.value = true
    const epId = route.params.id

    // 1. 取得當前集數與關聯的影集資訊
    const { data: epData, error: epError } = await supabase
      .from('episodes')
      .select('*, series(*)')
      .eq('id', epId)
      .single()

    if (epError) throw epError
    episode.value = epData

    // 2. 取得同季的其他集數 (供右側列表使用)
    if (epData.series_id) {
      const { data: listData } = await supabase
        .from('episodes')
        .select('id, season, episode, title, subtitles') // 把 subtitles 也拉出來判斷 CC 標籤
        .eq('series_id', epData.series_id)
        .eq('season', epData.season)
        .order('episode', { ascending: true })
        
      if (listData) {
        seriesEpisodes.value = listData
      }
    }

    // 3. 讀取本機觀看進度
    const progressKey = `progress_ep_${epId}`
    const localProgress = localStorage.getItem(progressKey)
    if (localProgress) {
      savedTime.value = parseFloat(localProgress)
    }

  } catch (err) {
    console.error('載入失敗:', err.message)
    alert('無法載入影片資訊')
  } finally {
    loading.value = false
  }
}

// 監聽路由變化，若點擊右側選單同一頁切換，重新抓取資料
watch(() => route.params.id, () => {
  fetchEpisodeData()
})

onMounted(() => {
  fetchEpisodeData()
})

// ==========================================
// 播放器控制邏輯
// ==========================================

// 導航至其他集數
const goToEpisode = (targetId) => {
  if (targetId === episode.value.id) return
  router.push(`/watch/ep/${targetId}`)
}

// 影片準備好時：恢復上次觀看進度
const resumeProgress = () => {
  if (videoPlayer.value && savedTime.value > 0 && videoPlayer.value.currentTime < 1) {
    videoPlayer.value.currentTime = savedTime.value
  }
}

// 影片播放中：每秒記錄進度至 LocalStorage
const onTimeUpdate = () => {
  if (videoPlayer.value && episode.value) {
    const progressKey = `progress_ep_${episode.value.id}`
    localStorage.setItem(progressKey, videoPlayer.value.currentTime)
  }
}

// 影片暫停時：(保留未來擴充同步至 Supabase DB 的接口)
const syncProgressToDB = () => {
  if (!videoPlayer.value || !episode.value) return
  // console.log(`影片暫停，目前進度: ${videoPlayer.value.currentTime} 秒`)
  // await supabase.from('user_profiles').update({ ... }) 
}

// 影片結束時：自動播放下一集
const playNextEpisode = () => {
  const currentIndex = seriesEpisodes.value.findIndex(ep => ep.id === episode.value.id)
  if (currentIndex !== -1 && currentIndex + 1 < seriesEpisodes.value.length) {
    const nextEp = seriesEpisodes.value[currentIndex + 1]
    goToEpisode(nextEp.id)
  }
}
</script>

<style scoped>
/* 自訂右側選單的卷軸樣式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.3); 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(79, 70, 229, 0.6); 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 70, 229, 1); 
}
</style>
