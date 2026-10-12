import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RoomForm } from '../components/rooms/RoomForm'
import { api } from '../lib/api'
import type { ApiRoom } from '../lib/api'

export function EditProperty() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<ApiRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void api<{ rooms: ApiRoom[] }>('/admin/rooms')
      .then(data => {
        if (!active) return
        const match = data.rooms.find(item => item.id === id)
        if (match) setRoom(match)
        else setError('Property not found.')
      })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Could not load property.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  return <>
    <Link className="text-link" to="/admin/rooms">Back to properties</Link>
    {loading && <p role="status">Loading property...</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {room && <RoomForm room={room} onSaved={() => navigate('/admin/rooms')} />}
  </>
}
