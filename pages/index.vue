<template>
  <div class="max-w-7xl mx-auto py-8 px-4">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-white">🍿 Meowtube 家庭劇院</h1>
      
      <button 
        @click="isAdmin = !isAdmin" 
        :class="isAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'" 
        class="px-4 py-2 rounded-lg font-bold text-white transition-colors shadow-lg flex items-center gap-2"
      >
        {{ isAdmin ? '❌ 退出管理模式' : '⚙️ 管理模式' }}
      </button>
    </div>

    <div v-if="pending" class="text-center text-gray-400 py-20 text-xl animate-pulse">
      載入片單中...
    </div>
    
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="movie in movies" :key="movie.id" class="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700 relative group transition-transform hover:-translate-y-1">
        
        <div v-if="isAdmin" class="absolute top-2 right-2 flex gap-2 z-10">
          <button @click.prevent="openEditModal(movie)" class="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg shadow-md text-white transition-colors" title="編輯電影">✏️</button>
          <button @click.prevent="handleDelete(movie.id, movie.tg_message_id)" class="bg-red-600 hover:bg-red-700 p-2 rounded-lg shadow-md text-white transition-colors" title="刪除電影與檔案">🗑️</button>
        </div>

        <NuxtLink :to="`/watch/${movie.id}`" class="block">
          <div class="aspect-video bg-gray-900 relative">
            <img v-if="movie.cover_url" :src="movie.cover_url" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-600">無海報</div>
            
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <span class="text-5xl drop-shadow-lg">▶️</span>
            </div>
          </div>
          <div class="p-4">
            <h2 class="text-lg font-bold text-white truncate">{{ movie.title }}</h2>
            <p class="text-sm text-gray-400 mt-1 line-clamp-2">{{ movie.description || '無簡介' }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-if="editingMovie" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div class="bg-gray-800 p-6 rounded-2xl w-full max-w-md border border-gray-600 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-3">✏️ 編輯電影資訊</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-gray-300 text-sm font-bold mb-2">電影名稱</label>
            <input v-model="editForm.title" type="text" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
          <div>
            <label class="block text-gray-300 text-sm font-bold mb-2">劇情簡介</label>
            <textarea v-model="editForm.description" rows="4" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
          </div>
          <div>
            <label class="block text-gray-300 text-sm font-bold mb-2">海報圖片網址</label>
            <input v-model="editForm.cover_url" type="url" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
          <div class="flex gap-3 justify-end mt-8 pt-4 border-t border-gray-700">
            <button @click="editingMovie = null" class="px-5 py-2.5 bg-gray-600 font-bold text-white rounded-lg hover:bg-gray-500 transition-colors">取消</button>
            <button @click="saveEdit" class="px-5 py-2.5 bg-blue-600 font-bold text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              儲存變更
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const supabase = useSupabaseClient()
const API_BASE_URL = 'https://lawxstudents168-meowtube-api.hf.space'

// 狀態控制
const isAdmin = ref(false)
const isSaving = ref(false)
const editingMovie = ref(null)
const editForm = ref({ id: '', title: '', description: '', cover_url: '' })

// 初始化載入電影清單
const { data: movies, pending, refresh } = await useAsyncData('movies', async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false }) // 最新的排在最前面
  
  if (error) console.error(error)
  return data || []
})

// ==========================================
// 🗑️ 刪除功能 (同步刪除 Supabase 與 TG 檔案)
// ==========================================
const handleDelete = async (dbId, tgMessageId) => {
  if (!confirm('⚠️ 確定要刪除這部電影嗎？\n這將會同步銷毀 Telegram 雲端上的實體影片檔，動作無法復原！')) return

  try {
    // 1. 呼叫 Hugging Face API 刪除 Telegram 檔案
    if (tgMessageId) {
      const res = await fetch(`${API_BASE_URL}/delete/${tgMessageId}`, { method: 'DELETE' })
      if (!res.ok) {
        console.warn('Telegram 端刪除異常，可能檔案已不存在，繼續刪除資料庫紀錄。')
      }
    }

    // 2. 刪除 Supabase 紀錄
    const { error } = await supabase.from('movies').delete().eq('id', dbId)
    if (error) throw error

    // 重新載入畫面
    await refresh()
  } catch (err) {
    alert('❌ 刪除失敗: ' + err.message)
  }
}

// ==========================================
// ✏️ 編輯功能
// ==========================================
const openEditModal = (movie) => {
  // 複製一份資料給表單，避免直接修改到畫面上的列表
  editingMovie.value = movie
  editForm.value = { 
    id: movie.id, 
    title: movie.title, 
    description: movie.description, 
    cover_url: movie.cover_url 
  }
}

const saveEdit = async () => {
  try {
    isSaving.value = true
    const { error } = await supabase.from('movies').update({
      title: editForm.value.title,
      description: editForm.value.description,
      cover_url: editForm.value.cover_url
    }).eq('id', editForm.value.id)

    if (error) throw error

    editingMovie.value = null
    await refresh() // 重新載入更新後的清單
  } catch (err) {
    alert('❌ 更新失敗: ' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>