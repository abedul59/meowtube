import { onBeforeUnmount, onMounted, ref } from 'vue'

const CLOUD_SYNC_INTERVAL_MS = 15_000
const PAUSE_SAVE_DELAY_MS = 3_000
const MIN_CLOUD_PROGRESS_CHANGE = 5

export const usePlaybackProgress = ({ supabase, videoPlayer, onMessage }) => {
  const savedTime = ref(0)

  let activeVideoId = null
  let activeStorageKey = null
  let pauseTimer = null
  let syncTimer = null
  let lastLocalWriteSecond = -1
  let lastCloudPosition = null
  let saveInFlight = null
  let queuedSave = false

  const clearPauseTimer = () => {
    if (pauseTimer) clearTimeout(pauseTimer)
    pauseTimer = null
  }

  const rememberLocally = (position) => {
    if (!activeStorageKey || !Number.isFinite(position)) return

    const wholeSecond = Math.floor(position)
    if (wholeSecond === lastLocalWriteSecond) return

    localStorage.setItem(activeStorageKey, String(position))
    lastLocalWriteSecond = wholeSecond
  }

  const runCloudSave = async (position, notify) => {
    const videoId = activeVideoId
    if (!videoId) return false

    const { error } = await supabase
      .from('playback_progress')
      .upsert({
        video_id: videoId,
        current_time: position,
        updated_at: new Date().toISOString()
      }, { onConflict: 'video_id' })

    if (error) {
      console.error('觀看進度同步失敗:', error)
      if (notify) onMessage?.('❌ 雲端同步失敗，進度已保存在此裝置')
      return false
    }

    lastCloudPosition = position
    savedTime.value = position
    if (notify) onMessage?.('☁️ 觀看進度已同步')
    return true
  }

  const saveProgress = async ({ force = false, notify = false } = {}) => {
    const player = videoPlayer.value
    // ended 事件會先清除進度；後續換頁或卸載時不可把片尾位置寫回去。
    if (player?.ended) return true

    const position = Number(player?.currentTime)
    if (!activeVideoId || !Number.isFinite(position) || position < 0) return false

    rememberLocally(position)

    if (!force && lastCloudPosition !== null && Math.abs(position - lastCloudPosition) < MIN_CLOUD_PROGRESS_CHANGE) {
      return true
    }

    if (saveInFlight) {
      queuedSave = true
      return saveInFlight
    }

    saveInFlight = runCloudSave(position, notify)
    const result = await saveInFlight
    saveInFlight = null

    if (queuedSave) {
      queuedSave = false
      return saveProgress({ force: true, notify: false })
    }

    return result
  }

  const loadProgress = async (videoId, storageKey) => {
    clearPauseTimer()
    activeVideoId = videoId
    activeStorageKey = storageKey
    savedTime.value = 0
    lastCloudPosition = null
    lastLocalWriteSecond = -1

    const { data, error } = await supabase
      .from('playback_progress')
      .select('current_time')
      .eq('video_id', videoId)
      .maybeSingle()

    if (error) console.error('讀取雲端觀看進度失敗:', error)

    const cloudPosition = Number(data?.current_time)
    if (Number.isFinite(cloudPosition) && cloudPosition > 0) {
      savedTime.value = cloudPosition
      lastCloudPosition = cloudPosition
    } else {
      const localPosition = Number(localStorage.getItem(storageKey))
      if (Number.isFinite(localPosition) && localPosition > 0) savedTime.value = localPosition
    }

    // 影片 metadata 可能比資料庫查詢更早完成，此時直接補套用進度。
    if (videoPlayer.value?.readyState >= 1) resumeProgress()
  }

  const resumeProgress = () => {
    const player = videoPlayer.value
    if (!player || savedTime.value <= 0) return

    // 已接近片尾的紀錄不再恢復，避免一開啟就立刻播放完畢。
    if (Number.isFinite(player.duration) && player.duration - savedTime.value <= 10) return
    player.currentTime = savedTime.value
  }

  const onTimeUpdate = () => {
    const position = Number(videoPlayer.value?.currentTime)
    if (Number.isFinite(position)) rememberLocally(position)
  }

  const onPause = () => {
    clearPauseTimer()
    if (videoPlayer.value?.ended) return
    pauseTimer = setTimeout(() => {
      pauseTimer = null
      void saveProgress({ force: true, notify: true })
    }, PAUSE_SAVE_DELAY_MS)
  }

  const onPlay = clearPauseTimer

  const clearProgress = async ({ notify = true } = {}) => {
    clearPauseTimer()
    if (activeStorageKey) localStorage.removeItem(activeStorageKey)
    savedTime.value = 0
    lastCloudPosition = 0

    if (!activeVideoId) return
    const { error } = await supabase
      .from('playback_progress')
      .delete()
      .eq('video_id', activeVideoId)

    if (error) {
      console.error('清除雲端觀看進度失敗:', error)
      if (notify) onMessage?.('❌ 雲端觀看進度清除失敗')
    } else if (notify) {
      onMessage?.('🗑️ 觀看進度已清除')
    }
  }

  const onEnded = async () => {
    await clearProgress({ notify: false })
  }

  const saveWhenHidden = () => {
    if (document.visibilityState === 'hidden') void saveProgress({ force: true, notify: false })
  }

  onMounted(() => {
    syncTimer = setInterval(() => {
      const player = videoPlayer.value
      if (player && !player.paused && !player.ended) void saveProgress()
    }, CLOUD_SYNC_INTERVAL_MS)
    document.addEventListener('visibilitychange', saveWhenHidden)
  })

  onBeforeUnmount(() => {
    clearPauseTimer()
    if (syncTimer) clearInterval(syncTimer)
    document.removeEventListener('visibilitychange', saveWhenHidden)
    void saveProgress({ force: true, notify: false })
  })

  return {
    savedTime,
    loadProgress,
    resumeProgress,
    onTimeUpdate,
    onPause,
    onPlay,
    onEnded,
    saveProgress,
    clearProgress
  }
}
