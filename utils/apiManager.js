export const VIDEO_API_URLS = [
  'https://meowtube-api-lawxstudent168.onrender.com',
  'https://meowtube-api-f0oz.onrender.com',
  'https://meowtube-api-10n0.onrender.com'
]

export const getApiUrlsByPriority = (date = new Date()) => {
  const day = date.getDate()
  const primaryIndex = day <= 10 ? 0 : day <= 20 ? 1 : 2

  return [
    ...VIDEO_API_URLS.slice(primaryIndex),
    ...VIDEO_API_URLS.slice(0, primaryIndex)
  ]
}

export const getActiveApiUrl = (date = new Date()) => getApiUrlsByPriority(date)[0]
