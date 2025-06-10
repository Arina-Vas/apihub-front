import type { Nullable } from "@/common/types"
import axios, { type AxiosError } from "axios"
import { authApi } from "@/features/auth/api/authApi.ts"
import { localStorageKeys } from "@/features/auth/api/authApi.types.ts"

export const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    "API-KEY": import.meta.env.VITE_API_KEY,
  },
})

let isRefreshing = false
let failedQueue: {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}[] = []

const processQueue = (error: unknown, token: Nullable<string>) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token)
    } else {
      prom.reject(error)
    }
  })

  failedQueue = []
}

// 👉 REQUEST INTERCEPTOR — добавляем accessToken
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(localStorageKeys.accessToken)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 👉 RESPONSE INTERCEPTOR — ловим 401 и пытаемся обновить токен
instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(localStorageKeys.refreshToken)
      if (!refreshToken) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // если уже идёт refresh — очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(axios(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await authApi.refreshToken({ refreshToken })
        const { accessToken: newToken, refreshToken: newRefresh } = response.data

        localStorage.setItem(localStorageKeys.accessToken, newToken)
        localStorage.setItem(localStorageKeys.refreshToken, newRefresh)

        processQueue(null, newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axios(originalRequest)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem(localStorageKeys.accessToken)
        localStorage.removeItem(localStorageKeys.refreshToken)
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
