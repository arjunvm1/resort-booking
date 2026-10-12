import { Link } from 'react-router-dom'
import { RoomForm } from '../components/rooms/RoomForm'

export function AddRoom({ onSaved }: { onSaved: () => void }) {
  return <>
    <Link className="text-link" to="/admin/rooms">Back to property</Link>
    <p>Add the entire property and upload its photos to make it available to guests.</p>
    <RoomForm onSaved={onSaved} />
  </>
}
