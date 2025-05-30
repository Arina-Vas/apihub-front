import { Navigate, useParams } from "react-router"
import { Path } from "@/common/routing"
import { useFetchTracksInPlaylist } from "../../../lib/hooks/useFetchTracksInPlaylist.ts"
import type { PlaylistItemAttributes } from "../../../../tracks/api/tracksApi.types.ts"
import { useEditTrack } from "../../../../tracks/lib/hooks/useEditTrack.ts"
import { EditTrackForm } from "../../../../tracks/ui/TracksPage/TracksList/EditTrackForm/EditTrackForm.tsx"
import { TrackItem } from "../../../../tracks/ui/TracksPage/TracksList/TrackItem/TrackItem.tsx"
import { useRemoveTrackFromPlaylist } from "../../../lib/hooks/useRemoveTrackFromPlaylist.ts"

export const PlaylistTracks = () => {
  const { playlistId } = useParams<{ playlistId?: string }>()

  const { tracks } = useFetchTracksInPlaylist(playlistId)
  const { register, handleSubmit, onSubmit, trackId, editTrackHandler } = useEditTrack()
  const { removeTrackFromPlaylist } = useRemoveTrackFromPlaylist(playlistId)

  if (!playlistId) return <Navigate to={Path.NotFound} />

  if (tracks.length === 0) return <h2>В данном плейлисте треков нет 😢</h2>

  return (
    <>
      <h2>Треки</h2>
      {tracks.map((track) => {
        const isEditing = trackId === track.id

        return (
          <div key={track.id}>
            {isEditing ? (
              <EditTrackForm
                register={register}
                onSubmit={onSubmit}
                handleSubmit={handleSubmit}
                editTrack={(e) => editTrackHandler(e, null)}
              />
            ) : (
              <TrackItem<PlaylistItemAttributes> track={track}>
                <div>
                  <button onClick={(e) => editTrackHandler(e, track)}>Редактировать</button>
                  <button onClick={(e) => removeTrackFromPlaylist(e, track.id)}>Удалить трек из плейлиста</button>
                </div>
              </TrackItem>
            )}
          </div>
        )
      })}
    </>
  )
}
