import { useEffect, useState } from 'react'
import { api } from './api'
import type { ApiRoom } from './api'

export function useRooms(id?: string) {
  const [result, setResult] = useState<{ id?: string; rooms: ApiRoom[]; error: string } | null>(null)
  useEffect(() => {
    let active = true
    const request = id
      ? api<{ room: ApiRoom }>(`/rooms/${encodeURIComponent(id)}`).then(data => [data.room])
      : api<{ rooms: ApiRoom[] }>('/rooms').then(data => data.rooms)
    void request.then(rooms => { if (active) setResult({ id, rooms, error: '' }) })
      .catch(error => { if (active) setResult({ id, rooms: [], error: error instanceof Error ? error.message : 'Could not load the property.' }) })
    return () => { active = false }
  }, [id])
  const current = result?.id === id ? result : null
  return { rooms: current?.rooms ?? [], loading: !current, error: current?.error ?? '' }
}
