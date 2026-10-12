import { useRef, useState } from 'react'

export function RoomGallery({ name, imageUrls }: { name: string; imageUrls: string[] }) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const move = (direction: number) => setIndex(current => (current + direction + imageUrls.length) % imageUrls.length)
  return <div className="room-gallery" role="region" aria-roledescription="carousel" aria-label={`${name} photos`} tabIndex={0} onKeyDown={event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }} onTouchStart={event => { touchStart.current = event.touches[0].clientX }} onTouchEnd={event => {
    if (touchStart.current !== null) {
      const delta = event.changedTouches[0].clientX - touchStart.current
      if (Math.abs(delta) > 50) move(delta > 0 ? -1 : 1)
    }
    touchStart.current = null
  }}>
    <img className="detail-photo" src={imageUrls[index]} alt={`${name}, photo ${index + 1}`} />
    {imageUrls.length > 1 && <>
      <div className="gallery-controls">
        <button type="button" className="button secondary" aria-label="Previous room photo" onClick={() => move(-1)}>←</button>
        <span role="status" aria-live="polite">{index + 1} / {imageUrls.length}</span>
        <button type="button" className="button secondary" aria-label="Next room photo" onClick={() => move(1)}>→</button>
      </div>
      <div className="thumbnails">
        {imageUrls.map((url, position) => <button type="button" key={url} aria-label={`View room photo ${position + 1}`} aria-pressed={position === index} onClick={() => setIndex(position)}><img src={url} alt="" loading="lazy" /></button>)}
      </div>
    </>}
  </div>
}
