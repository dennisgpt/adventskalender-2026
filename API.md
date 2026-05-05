# THWS Adventskalender — API Contract

Base URL: `http://<server-ip>/api`

---

## Authentication

Admin routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is returned by `POST /api/admin/login`. It expires after **8 hours**.

Requests to protected routes without a valid token return:

```json
{ "error": "Nicht autorisiert." }
```
Status: `401`

---

## Public Endpoints

### `GET /api/health`

Health check.

**Response 200**
```json
{ "status": "ok" }
```

---

### `GET /api/years/current`

Returns the active calendar year.

**Response 200**
```json
{
  "id": 1,
  "year": 2026,
  "is_current": true,
  "start_date": "2026-12-01"
}
```

**Response 404**
```json
{ "error": "Kein aktives Kalenderjahr konfiguriert." }
```

---

### `GET /api/days`

Returns all 24 doors for the current year. Does **not** return content — only lock status.

**Response 200**
```json
[
  {
    "day_number": 1,
    "unlock_date": "2026-12-01T00:00:00.000Z",
    "is_unlocked": true
  },
  {
    "day_number": 2,
    "unlock_date": "2026-12-02T00:00:00.000Z",
    "is_unlocked": false
  }
]
```

---

### `GET /api/days/:dayNumber/content`

Returns the content for a door. Blocked by `dateGuard` if not yet unlocked.

If the door has `is_randomized: true`, the server picks **one random item** from the pool.
If `is_randomized: false`, all items are returned sorted by `sort_order`.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| dayNumber | integer 1–24 | Door number |

**Response 200**
```json
{
  "day_number": 3,
  "unlock_date": "2026-12-03T00:00:00.000Z",
  "contents": [
    {
      "id": 7,
      "type": "text",
      "body": "Frohe Adventszeit!",
      "media_url": null
    },
    {
      "id": 12,
      "type": "image",
      "body": null,
      "media_url": "/uploads/bild.jpg"
    }
  ]
}
```

**Quiz content item** — `body` is a JSON string:
```json
{
  "id": 15,
  "type": "quiz",
  "body": "{\"question\":\"Was ist die Hauptstadt von Bayern?\",\"options\":[\"Berlin\",\"München\",\"Nürnberg\",\"Augsburg\"],\"correct\":1}",
  "media_url": null
}
```

**Response 403** — door not yet unlocked
```json
{ "error": "Dieses Türchen ist noch nicht freigeschaltet." }
```

**Response 404** — door number doesn't exist
```json
{ "error": "Kalenderjahr oder Kalendertag nicht gefunden." }
```

---

## Admin Endpoints

All routes below require `Authorization: Bearer <token>`.

---

### `POST /api/admin/login`

**Request body**
```json
{
  "username": "admin",
  "password": "geheim123"
}
```

**Response 200**
```json
{
  "token": "<jwt>",
  "expires_at": "2026-12-01T08:00:00.000Z",
  "role": "admin"
}
```

**Response 401**
```json
{ "error": "Ungültige Anmeldedaten." }
```

---

### `POST /api/admin/logout`

Invalidates the current token (server-side blocklist).

**Response 200**
```json
{ "message": "Erfolgreich abgemeldet." }
```

---

### `GET /api/admin/content`

Returns all content items in the pool (including inactive ones).

**Response 200**
```json
[
  {
    "id": 1,
    "type": "text",
    "body": "Willkommen!",
    "media_url": null,
    "is_active": true,
    "created_at": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": 2,
    "type": "image",
    "body": null,
    "media_url": "/uploads/bild.jpg",
    "is_active": true,
    "created_at": "2026-11-01T10:05:00.000Z"
  },
  {
    "id": 3,
    "type": "quiz",
    "body": "{\"question\":\"...\",\"options\":[...],\"correct\":0}",
    "media_url": null,
    "is_active": false,
    "created_at": "2026-11-02T09:00:00.000Z"
  }
]
```

---

### `POST /api/admin/content`

Creates a new content item.

**Request body**
```json
{
  "type": "text",
  "body": "Ein neuer Adventsgruß!",
  "media_url": null
}
```

For a quiz:
```json
{
  "type": "quiz",
  "body": "{\"question\":\"Was ist 2+2?\",\"options\":[\"3\",\"4\",\"5\",\"6\"],\"correct\":1}",
  "media_url": null
}
```

**Fields**
| Field | Required | Description |
|-------|----------|-------------|
| type | yes | `text` \| `image` \| `video` \| `game` \| `quiz` |
| body | no | Text content or JSON string for quiz |
| media_url | no | Path or URL for image/video |

**Response 201**
```json
{
  "id": 16,
  "type": "quiz",
  "body": "{...}",
  "media_url": null,
  "is_active": true,
  "created_at": "2026-11-05T14:00:00.000Z"
}
```

**Response 400**
```json
{ "error": "Ungültiger Content-Typ." }
```

---

### `PUT /api/admin/content/:id`

Updates an existing content item.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| id | integer | Content item ID |

**Request body** — send only the fields you want to change:
```json
{
  "body": "Aktualisierter Text.",
  "is_active": false
}
```

**Response 200** — returns the updated item (same shape as POST response)

**Response 404**
```json
{ "error": "Content-Eintrag nicht gefunden." }
```

---

### `DELETE /api/admin/content/:id`

Permanently deletes a content item. This also removes all `day_assignments` referencing it.

**Response 200**
```json
{ "message": "Content-Eintrag gelöscht." }
```

**Response 404**
```json
{ "error": "Content-Eintrag nicht gefunden." }
```

---

### `GET /api/admin/days`

Returns all 24 doors for the current year with their assigned content and settings.

**Response 200**
```json
[
  {
    "id": 1,
    "day_number": 1,
    "unlock_date": "2026-12-01T00:00:00.000Z",
    "is_randomized": false,
    "contents": [
      {
        "id": 3,
        "type": "text",
        "body": "Willkommen!",
        "media_url": null,
        "sort_order": 0
      }
    ]
  },
  {
    "id": 2,
    "day_number": 2,
    "unlock_date": "2026-12-02T00:00:00.000Z",
    "is_randomized": true,
    "contents": [
      { "id": 7, "type": "image", "media_url": "/uploads/a.jpg", "sort_order": 0 },
      { "id": 9, "type": "video", "media_url": "/uploads/b.mp4", "sort_order": 1 },
      { "id": 15, "type": "quiz", "body": "{...}", "sort_order": 2 }
    ]
  }
]
```

---

### `PUT /api/admin/days/:dayId`

Updates a door's unlock date and/or randomization setting.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| dayId | integer | Internal door ID (from `GET /api/admin/days`) |

**Request body** — send only the fields you want to change:
```json
{
  "unlock_date": "2026-12-05T08:00:00.000Z",
  "is_randomized": true
}
```

**Response 200**
```json
{
  "id": 5,
  "day_number": 5,
  "unlock_date": "2026-12-05T08:00:00.000Z",
  "is_randomized": true
}
```

**Response 404**
```json
{ "error": "Türchen nicht gefunden." }
```

---

### `POST /api/admin/days/:dayId/assign`

Assigns a content item to a door.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| dayId | integer | Internal door ID |

**Request body**
```json
{
  "content_id": 12,
  "sort_order": 0
}
```

**Response 201**
```json
{ "message": "Inhalt erfolgreich zugewiesen." }
```

**Response 404**
```json
{ "error": "Türchen oder Content-Eintrag nicht gefunden." }
```

**Response 409** — already assigned
```json
{ "error": "Dieser Inhalt ist diesem Türchen bereits zugewiesen." }
```

---

### `DELETE /api/admin/days/:dayId/assign/:contentId`

Removes a content item from a door.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| dayId | integer | Internal door ID |
| contentId | integer | Content item ID |

**Response 200**
```json
{ "message": "Zuweisung entfernt." }
```

**Response 404**
```json
{ "error": "Zuweisung nicht gefunden." }
```

---

### `GET /api/admin/years`

Returns all calendar years.

**Response 200**
```json
[
  {
    "id": 1,
    "year": 2026,
    "is_current": true,
    "start_date": "2026-12-01"
  },
  {
    "id": 2,
    "year": 2027,
    "is_current": false,
    "start_date": "2027-12-01"
  }
]
```

---

### `POST /api/admin/years`

Creates a new calendar year and auto-generates all 24 door rows.

**Request body**
```json
{
  "year": 2027,
  "start_date": "2027-12-01",
  "is_current": false
}
```

**Response 201**
```json
{
  "id": 2,
  "year": 2027,
  "is_current": false,
  "start_date": "2027-12-01"
}
```

**Response 409**
```json
{ "error": "Dieses Jahr existiert bereits." }
```

---

### `PUT /api/admin/years/:id`

Updates a calendar year. Setting `is_current: true` automatically sets all other years to `false`.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| id | integer | Year ID |

**Request body** — send only the fields you want to change:
```json
{
  "is_current": true
}
```

**Response 200**
```json
{
  "id": 2,
  "year": 2027,
  "is_current": true,
  "start_date": "2027-12-01"
}
```

**Response 404**
```json
{ "error": "Kalenderjahr nicht gefunden." }
```

---

## Common Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request — missing or invalid fields |
| 401 | Missing or invalid auth token |
| 403 | Door not yet unlocked (dateGuard) |
| 404 | Resource not found |
| 409 | Conflict — duplicate entry |
| 500 | Internal server error |
