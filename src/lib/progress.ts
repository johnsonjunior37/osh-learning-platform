import { useCallback, useEffect, useState } from 'react'

const KEY = 'osh-reading-progress-v1'

function read(): number[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

function write(ids: number[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // 無痕模式或儲存空間不可用時忽略，進度僅為便利功能
  }
}

/** 本機閱讀進度，只存在這台裝置的瀏覽器，不上傳。 */
export function useReadingProgress() {
  const [done, setDone] = useState<number[]>(() => read())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setDone(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback((id: number, value: boolean) => {
    setDone((prev) => {
      const next = value ? [...new Set([...prev, id])] : prev.filter((n) => n !== id)
      write(next)
      return next
    })
  }, [])

  return { done, toggle, isDone: (id: number) => done.includes(id) }
}
