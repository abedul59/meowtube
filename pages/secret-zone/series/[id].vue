<template>
  <div class="p-8 text-white min-h-screen bg-gray-900">
    <div v-if="pending" class="text-xl text-blue-400">⏳ 努力讀取私密檔案中...</div>
    <div v-else-if="error" class="text-red-500 text-xl">❌ 糟糕，發生錯誤了: {{ error.message }}</div>
    <div v-else>
      <!-- 返回按鈕 -->
      <button 
        @click="router.back()" 
        class="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 transition-colors rounded text-sm"
      >
        ← 返回私密區列表
      </button>

      <!-- 影集標題與簡介 -->
      <h1 class="text-3xl font-bold mb-4 text-purple-400">🎬 {{ seriesData?.title }}</h1>
      <p class="mb-8 text-gray-300">{{ seriesData?.description || '這部影集很神祕，沒有留下任何簡介。' }}</p>

      <!-- 集數列表 -->
      <h2 class="text-2xl mb-4 border-b border-gray-700 pb-2">集數列表</h2>
      
      <div v-if="episodesData.length === 0" class="text-gray-500 mt-4">
        目前還沒有上傳任何集數喔！
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="ep in episodesData" 
          :key="ep.id"
          class="border border-gray-700 p-5 rounded-lg hover:bg-gray-800 hover:border-purple-500 cursor-pointer transition-all shadow-md"
          @click="goToPlay(ep.id)"
        >
          <!-- 💡 這裡已經修正為 ep.episode -->
          <h3 class="text-xl font-bold text-blue-300 mb-2">第 {{ ep.episode }} 集</h3>
          <p class="text-gray-400 truncate" :title="ep.title">{{ ep.title }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient() 

const seriesId = route.params.id

const pending = ref(true)
const error = ref(null)
const seriesData = ref(null)
const episodesData = ref([])

const goToPlay = (episodeId) => {
  router.push(`/secret-zone/play/${episodeId}`)
}

onMounted(async () => {
  // 權限檢查區塊 (目前已註解，讓您能直接看到畫面確認資料！)
  /*
  const isUnlocked = sessionStorage.getItem('您設定的密碼Key') 
  if (!isUnlocked) {
    router.push('/secret-zone') 
    return
  }
  */

  try {
    const { data: series, error: seriesError } = await supabase
      .from('secret_series')
      .select('*')
      .eq('id', seriesId)
      .single()

    if (seriesError) throw seriesError
    seriesData.value = series

    // 💡 這裡的排序條件已經修正為 'episode'
    const { data: episodes, error: episodesError } = await supabase
      .from('secret_episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('episode', { ascending: true })

    if (episodesError) throw episodesError
    episodesData.value = episodes

  } catch (err) {
    console.error('抓取資料失敗:', err)
    error.value = err
  } finally {
    pending.value = false 
  }
})
</script>
