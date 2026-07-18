<template>
  <div v-if="isAuthenticated" class="p-8">
    <div v-if="pending">載入中...</div>
    <div v-else-if="error">找不到該私密影集或發生錯誤</div>
    <div v-else>
      <h1 class="text-3xl font-bold mb-4">{{ seriesData?.title }}</h1>
      <p class="mb-8 text-gray-400">{{ seriesData?.description }}</p>

      <h2 class="text-2xl mb-4">集數列表</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          v-for="episode in episodesData" 
          :key="episode.id"
          class="border border-gray-700 p-4 rounded-lg hover:bg-gray-800 cursor-pointer"
        >
          <!-- 這裡可以替換成您的私密播放頁面路由 -->
          <NuxtLink :to="`/secret-zone/play/${episode.id}`">
            <h3 class="text-xl">第 {{ episode.episode_number }} 集</h3>
            <p>{{ episode.title }}</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="p-8 text-red-500">
    您沒有權限訪問此私密區域，請先輸入密碼解鎖。
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// 從網址列取得 UUID
const seriesId = route.params.id

const isAuthenticated = ref(false)
const pending = ref(true)
const error = ref(null)
const seriesData = ref(null)
const episodesData = ref([])

onMounted(async () => {
  // 1. 檢查 sessionStorage 權限
const secretAuth = sessionStorage.getItem('isSecretUnlocked')
if (secretAuth !== 'yes') {
  router.push('/secret-zone')
  return
}
  
  isAuthenticated.value = true

  try {
    // 2. 查詢私密影集主檔 (secret_series)
    const { data: series, error: seriesError } = await supabase
      .from('secret_series')
      .select('*')
      .eq('id', seriesId)
      .single()

    if (seriesError) throw seriesError
    seriesData.value = series

    // 3. 查詢該影集底下的私密集數 (secret_episodes)
    const { data: episodes, error: episodesError } = await supabase
      .from('secret_episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('episode_number', { ascending: true })

    if (episodesError) throw episodesError
    episodesData.value = episodes

  } catch (err) {
    console.error(err)
    error.value = err
  } finally {
    pending.value = false
  }
})
</script>
