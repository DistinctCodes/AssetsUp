# Asset Notes

Free-form annotations by team members on an asset ("battery replaced",
"assigned for the Lagos office move"), powering the Notes tab on the asset
detail page.

## Entity — `AssetNote`

`id`, `asset` (ManyToOne), `body` (text), `author` (ManyToOne User), `createdAt`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`    | `/api/assets/:id/notes` | List notes, newest first |
| `POST`   | `/api/assets/:id/notes` | Create a note `{ body }` |
| `DELETE` | `/api/assets/:id/notes/:noteId` | Delete a note (author only) |

Only the note's author (or an admin) may delete it. Creating a note records a
`NOTE_ADDED` asset-history event.
