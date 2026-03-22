import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}, (error) => Promise.reject(error))

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const pd = error.response?.data
    let message = 'Network error — please check your connection.'
    if (pd?.detail)                    message = pd.detail
    else if (pd?.title)                message = pd.title
    else if (typeof pd === 'string')   message = pd
    else if (error.message)            message = error.message
    const err = new Error(message)
    err.status      = error.response?.status
    err.fieldErrors = pd?.fieldErrors ?? {}
    err.raw         = error.response?.data
    return Promise.reject(err)
  }
)

export async function downloadBlob(path, method = 'GET', body = null, filename = 'download.pdf') {
  const response = await axios({
    method,
    url:          `/api${path}`,
    data:         body,
    responseType: 'blob',
    timeout:      60_000,
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('sp_token')
        ? { Authorization: `Bearer ${localStorage.getItem('sp_token')}` }
        : {}),
    },
  })
  const blob = response.data
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default api
