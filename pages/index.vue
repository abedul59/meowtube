<template>
  <div class="max-w-7xl mx-auto py-8 px-4">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-white">🍿 Meowtube 家庭劇院</h1>
      <button @click="isAdmin = !isAdmin" :class="isAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'" class="px-4 py-2 rounded-lg font-bold text-white transition-colors shadow-lg flex items-center gap-2">
        {{ isAdmin ? '❌ 退出管理模式' : '⚙️ 管理模式' }}
      </button>
    </div>

    <div v-if="pending" class="text-center text-gray-400 py-20 text-xl animate-pulse">載入片單中...</div>
    
    <div v-else>
      <div class="mb-12">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-2">📺 影集與動畫</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div v-for="s in seriesList" :key="s.id" class="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700 relative group transition-transform hover:-translate-y-1">
            
            <div v-if="isAdmin" class="absolute top-2 right-2 flex gap-2 z-10">
              <button @click.prevent="openEditSeries(s)" class="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg shadow-md text-white transition-colors">✏️</button>
              <button @click.prevent="handleDeleteSeries(s.id)" class="bg-red-600 hover:bg-red-700 p-2 rounded-lg shadow-md text-white transition-colors">🗑️</button>
            </div>

            <NuxtLink :to="`/series/${s.id}`" class="block">
              <div class="aspect-video bg-gray-900 relative">
                <img v-if="s.cover_url" :src="s.cover_url" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-600 font-bold">無海報</div>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><span class="text-5xl drop-shadow-lg">📁</span></div>
              </div>
              <div class="p-4">
                <h3 class="text-lg font-bold text-indigo-400 truncate">{{ s.title }}</h3>
                <p class="text-sm text-gray-400 mt-1 line-clamp-2">{{ s.description || '無簡介' }}</p>
              </div>
            </NuxtLink>
          </div>
          <div v-if="seriesList.length === 0" class="col-span-full text-center py-10 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">目前沒有影集。</div>
        </div>
      </div>

      <div>
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-2">🎬 獨立電影</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div v-for="movie in movies" :key="movie.id" class="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700 relative group transition-transform hover:-translate-y-1">
            
            <div v-if="isAdmin" class="absolute top-2 right-2 flex gap-2 z-10">
              <button @click.prevent="openEditMovie(movie)" class="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg shadow-md text-white transition-colors">✏️</button>
              <button @click.prevent="handleDeleteMovie(movie.id, movie.tg_message_id)" class="bg-red-600 hover:bg-red-700 p-2 rounded-lg shadow-md text-white transition-colors">🗑️</button>
            </div>

            <NuxtLink :to="`/watch/${movie.id}`" class="block">
              <div class="aspect-video bg-gray-900 relative">
                <img v-if="movie.cover_url" :src="movie.cover_url" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-600 font-bold">無海報</div>
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><span class="text-5xl drop-shadow-lg">▶️</span></div>
              </div>
              <div class="p-4">
                <h3 class="text-lg font-bold text-white truncate">{{ movie.title }}</h3>
                <p class="text-sm text-gray-400 mt-1 line-clamp-2">{{ movie.description || '無簡介' }}</p>
              </div>
            </NuxtLink>
          </div>
          <div v-if="movies.length === 0" class="col-span-full text-center py-10 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">目前沒有電影。</div>
        </div>
      </div>
    </div>

    <div v-if="editingItem" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div class="bg-gray-800 p-6 rounded-2xl w-full max-w-md border border-gray-600 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-3">✏️ 編輯{{ editingType === 'movie' ? '電影' : '影集' }}資訊</h3>
        <div class="space-y-4">
          <div><label class="block text-gray-300 text-sm font-bold mb-2">名稱</label><input v-model="editForm.title" type="text" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none"></div>
          <div><label class="block text-gray-300 text-sm font-bold mb-2">簡介</label><textarea v-model="editForm.description" rows="4" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none"></textarea></div>
          <div><label class="block text-gray-300 text-sm font-bold mb-2">海報圖片網址</label><input v-model="editForm.cover_url" type="url" class="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none"></div>
          
          <div class="flex gap-3 justify-end mt-8 pt-4 border-t border-gray-700">
            <button @click="editingItem = null" class="px-5 py-2.5 bg-gray-600 font-bold text-white rounded-lg hover:bg-gray-500 transition-colors">取消</button>
            <button @click="saveEdit" class="px-5 py-2.5 bg-blue-600 font-bold text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>儲存變更
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

const isAdmin = ref(false)
const isSaving = ref(false)
const editingItem = ref(null)
const editingType = ref('') // 'movie' 或 'series'
const editForm = ref({ id: '', title: '', description: '', cover_url: '' })

// 同時載入電影與影集
const { data: fetchResult, pending } = await useAsyncData('home-data', async () => {
  const [moviesRes, seriesRes] = await Promise.all([
    supabase.from('movies').select('*').order('created_at', { ascending: false }),
    supabase.from('series').select('*').order('created_at', { ascending: false })
  ])
  return { movies: moviesRes.data || [], seriesList: seriesRes.data || [] }
})

const movies = ref(fetchResult.value?.movies || [])
const seriesList = ref(fetchResult.value?.seriesList || [])

// --- 🗑️ 刪除電影 ---
const handleDeleteMovie = async (dbId, tgMessageId) => {
  if (!confirm('⚠️ 確定要刪除這部電影嗎？\n這將會同步銷毀 Telegram 雲端檔案！')) return
  try {
    if (tgMessageId) await fetch(`${API_BASE_URL}/delete/${tgMessageId}`, { method: 'DELETE' }).catch(()=>console.warn('TG 刪除失敗'))
    await supabase.from('movies').delete().eq('id', dbId)
    movies.value = movies.value.filter(m => m.id !== dbId)
  } catch (err) { alert('❌ 刪除失敗: ' + err.message) }
}

// --- 🗑️ 刪除影集 (連帶刪除底下所有集數與檔案) ---
const handleDeleteSeries = async (seriesId) => {
  if (!confirm('⚠️ 確定要刪除這部「影集」嗎？\n這將會自動銷毀底下【所有的集數】與 TG 雲端檔案，動作無法復原！')) return
  try {
    // 1. 先抓出這部影集底下所有的集數 (為了拿到 TG 的 message_id)
    const { data: eps } = await supabase.from('episodes').select('tg_message_id').eq('series_id', seriesId)
    
    // 2. 迴圈呼叫 API 刪除 TG 雲端實體檔案
    if (eps && eps.length > 0) {
      for (const ep of eps) {
        await fetch(`${API_BASE_URL}/delete/${ep.tg_message_id}`, { method: 'DELETE' }).catch(()=>console.warn('TG 刪除失敗'))
      }
    }

    // 3. 刪除 Supabase 的影集紀錄 (因設定了 CASCADE，會自動清空 episodes 表裡的紀錄)
    await supabase.from('series').delete().eq('id', seriesId)
    seriesList.value = seriesList.value.filter(s => s.id !== seriesId)
    alert('✅ 影集與所有集數已成功銷毀！')
  } catch (err) { alert('❌ 刪除失敗: ' + err.message) }
}

// --- ✏️ 編輯相關 ---
const openEditMovie = (item) => { editingType.value = 'movie'; editingItem.value = item; editForm.value = { ...item } }
const openEditSeries = (item) => { editingType.value = 'series'; editingItem.value = item; editForm.value = { ...item } }

const saveEdit = async () => {
  try {
    isSaving.value = true
    const tableName = editingType.value === 'movie' ? 'movies' : 'series'
    const { error } = await supabase.from(tableName).update({
      title: editForm.value.title,
      description: editForm.value.description,
      cover_url: editForm.value.cover_url
    }).eq('id', editForm.value.id)
    if (error) throw error

    // 即時更新畫面資料
    if (editingType.value === 'movie') {
      const idx = movies.value.findIndex(m => m.id === editForm.value.id)
      if (idx !== -1) movies.value[idx] = { ...editForm.value }
    } else {
      const idx = seriesList.value.findIndex(s => s.id === editForm.value.id)
      if (idx !== -1) seriesList.value[idx] = { ...editForm.value }
    }
    editingItem.value = null
  } catch (err) { alert('❌ 更新失敗: ' + err.message) } 
  finally { isSaving.value = false }
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>