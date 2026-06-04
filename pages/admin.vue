<template>
  <div class="max-w-2xl mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-white">⚙️ 劇院管理後台</h1>

    <div class="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 shadow-xl">
      <h2 class="text-xl font-semibold mb-6 text-red-500">上傳新電影</h2>
      
      <form @submit.prevent="handleUpload" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">選擇影片檔 (MP4)</label>
          <input 
            type="file" 
            @change="onFileChange" 
            accept="video/mp4,video/*" 
            required 
            class="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">電影名稱</label>
          <input type="text" v-model="form.title" required placeholder="例如：全面啟動" class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">劇情簡介</label>
          <textarea v-model="form.description" rows="3" placeholder="輸入電影簡介..." class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">海報圖片網址 (選填)</label>
          <input type="url" v-model="form.coverUrl" placeholder="https://..." class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID (若無可留空)</label>
          <input type="number" v-model="form.topicId" class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500" />
        </div>

        <div class="pt-4 border-t border-gray-700">
          <button 
            type="submit" 
            :disabled="isUploading"
            class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <span v-if="isUploading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ isUploading ? uploadStatus : '🚀 確認上傳並發布' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const supabase = useSupabaseClient()
const API_BASE_URL = 'https://lawxstudents168-meowtube-api.hf.space'

const file = ref(null)
const isUploading = ref(false)
const uploadStatus = ref('')

const form = reactive({ title: '', description: '', coverUrl: '', topicId: '' })

const onFileChange = (e) => { file.value = e.target.files[0] }

const handleUpload = async () => {
  if (!file.value) return alert('請先選擇影片檔案！')

  try {
    isUploading.value = true
    uploadStatus.value = '正在上傳至 Hugging Face (轉發至 TG)...'
    
    const formData = new FormData()
    formData.append('file', file.value)
    if (form.topicId) formData.append('topic_id', form.topicId)
    formData.append('caption', `🎬 ${form.title}\n${form.description}`)

    const uploadRes = await fetch(`${API_BASE_URL}/upload/`, { method: 'POST', body: formData })
    if (!uploadRes.ok) throw new Error('伺服器回應錯誤')
    const uploadData = await uploadRes.json()

    if (!uploadData.success) throw new Error(`上傳失敗: ${uploadData.detail}`)

    uploadStatus.value = '檔案已上傳！正在寫入資料庫...'
    const { error: dbError } = await supabase.from('movies').insert({
        title: form.title,
        description: form.description,
        cover_url: form.coverUrl,
        topic_id: form.topicId ? parseInt(form.topicId) : null,
        tg_message_id: uploadData.message_id
    })

    if (dbError) throw new Error(`寫入資料庫失敗: ${dbError.message}`)

    alert('✅ 電影上傳並發布成功！')
    file.value = null; form.title = ''; form.description = ''; form.coverUrl = ''; form.topicId = ''
    document.querySelector('input[type="file"]').value = ''
  } catch (error) {
    alert(`❌ 發生錯誤：\n${error.message}`)
  } finally {
    isUploading.value = false; uploadStatus.value = ''
  }
}
</script>