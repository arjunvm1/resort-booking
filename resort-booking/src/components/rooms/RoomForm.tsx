import { useRef, useState } from "react"
import { api } from "../../lib/api"
import type { ApiRoom } from "../../lib/api"
import { storeRoomImage, validateRoomPhoto } from "../../lib/roomImages"

const normalizeRoomId = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-/, '').slice(0, 60)

export function RoomForm({ room, onSaved }: { room?: ApiRoom; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>(room?.imageUrls?.length ? room.imageUrls : room?.image ? [room.image] : [])
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const handleImageSubmit = async () => {
    setError("")
    if (!files.length) { setError("Choose photos to upload."); return }
    if (files.length + imageUrls.length > 6) { setError("You can upload up to six photos per room."); return }
    try { files.forEach(validateRoomPhoto) }
    catch (error) { setError(error instanceof Error ? error.message : "Invalid photos."); return }
    setUploading(true)
    try {
      const results = await Promise.allSettled(files.map(storeRoomImage))
      const urls = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      setImageUrls(previous => [...previous, ...urls])
      const remaining = files.filter((_, index) => results[index].status === 'rejected')
      setFiles(remaining)
      if (!remaining.length && fileInput.current) fileInput.current.value = ''
      const failed = results.find(result => result.status === 'rejected')
      if (failed?.status === 'rejected') setError(failed.reason instanceof Error ? failed.reason.message : 'Some photos failed to upload. Retry the remaining photos.')
    } finally { setUploading(false) }
  }
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const data = new FormData(form)
        const input = {
          name: String(data.get("name")).trim(),
          category: String(data.get("category")).trim(),
          description: String(data.get("description")).trim(),
          image: imageUrls[0] ?? "",
          imageUrls,
          price: Number(data.get("price")),
          guests: Number(data.get("guests")),
          size: Number(data.get("size")),
          inventory: Number(data.get("inventory")),
          pool: data.get("pool") === "on",
          active: data.get("active") === "on",
          ...(!room ? { id: normalizeRoomId(String(data.get("id"))).replace(/-$/, '') } : {}),
        }
        setSaving(true)
        setError("")
        try {
          if (!room && !/^[a-z0-9-]{1,60}$/.test(input.id ?? '')) throw new Error('Enter a room ID containing letters or numbers, such as ocean-view-suite.')
          if (files.length) throw new Error("Upload your selected photos before saving the room.")
          if (!imageUrls.length) throw new Error("Upload at least one room photo.")
          await api(room ? `/admin/rooms/${room.id}` : "/admin/rooms", {
            method: room ? "PATCH" : "POST",
            body: JSON.stringify(input),
          })
          if (!room) {
            form.reset()
            setImageUrls([])
            setFiles([])
          }
          onSaved()
        } catch (error) {
          setError(error instanceof Error ? error.message : "Could not save room.")
        } finally {
          setSaving(false)
        }
      }}
    >
      <h3>{room ? room.name : "Add a room type"}</h3>
      <fieldset
        disabled={saving || uploading}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {!room && (
          <label>
            Room ID
            <input
              name="id"
              required
              pattern="[a-z0-9-]{1,60}"
              maxLength={60}
              placeholder="e.g. ocean-view-suite"
              onChange={e => { e.target.value = normalizeRoomId(e.target.value) }}
              onBlur={e => { e.target.value = normalizeRoomId(e.target.value).replace(/-$/, '') }}
            />
            <small>Use a unique ID. Capitals become lowercase and spaces become hyphens.</small>
          </label>
        )}
        <label>
          Room name
          <input
            name="name"
            required
            minLength={2}
            maxLength={150}
            defaultValue={room?.name}
          />
        </label>
        <label>
          Category
          <input
            name="category"
            maxLength={150}
            defaultValue={room?.category}
            placeholder="e.g. Waterfront suite"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={3000}
            defaultValue={room?.description}
          />
        </label>
        <label>
          Room photos
          <input ref={fileInput} name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => {
            setError('')
            const selected = Array.from(e.target.files ?? [])
            try {
              if (selected.length + imageUrls.length > 6) throw new Error('You can upload up to six photos per room.')
              selected.forEach(validateRoomPhoto)
              setFiles(selected)
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Invalid photos.')
              e.target.value = ''
              setFiles([])
            }
          }} />
          <small>Up to six JPEG, PNG, or WebP photos, 5 MB each. The first photo is the cover.</small>
        </label>
        <button type="button" className="button secondary" disabled={!files.length || uploading} onClick={() => void handleImageSubmit()}>
          {uploading ? 'Uploading photos...' : `Upload photos${files.length ? ` (${files.length})` : ''}`}
        </button>
        <div className="room-image-editor">
          {imageUrls.map((url, index) => <div key={url}>
            <img src={url} alt={`Room photo ${index + 1}`} />
            <span>{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span>
            <button type="button" className="text-link" onClick={() => setImageUrls(previous => previous.filter((_, i) => i !== index))}>Remove photo {index + 1}</button>
          </div>)}
        </div>
        <label>
          Nightly price (INR)
          <input
            name="price"
            type="number"
            min="1"
            max="1000000"
            step="1"
            required
            defaultValue={room?.price}
          />
        </label>
        <label>
          Maximum guests per room
          <input
            name="guests"
            type="number"
            min="1"
            max="20"
            step="1"
            required
            defaultValue={room?.guests ?? 2}
          />
        </label>
        <label>
          Room size (m²)
          <input
            name="size"
            type="number"
            min="1"
            max="10000"
            step="any"
            required
            defaultValue={room?.size}
          />
        </label>
        <label>
          Room inventory
          <input
            name="inventory"
            type="number"
            min="0"
            max="1000"
            step="1"
            required
            defaultValue={room?.inventory ?? 1}
          />
        </label>
        <label className="checkbox">
          <input
            name="pool"
            type="checkbox"
            defaultChecked={room?.pool ?? false}
          />{" "}
          Private swimming pool
        </label>
        <label className="checkbox">
          <input
            name="active"
            type="checkbox"
            defaultChecked={room?.active ?? true}
          />{" "}
          Available for new reservations
        </label>
        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}
        <button className="button">{saving ? "Saving..." : room ? "Save room" : "Add room"}</button>
      </fieldset>
    </form>
  )
}
