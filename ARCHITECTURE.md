# Architecture & Component Reference

## Overview

The app is a fully client-side SPA. There is no backend. All state is persisted in Google Drive:

- **`treatments.json`** — the single source of truth for all treatment records (Drive root)
- **`MedicalExpenses/…` folder tree** — uploaded files (receipts, approvals) organised by year / type / provider / treatment

```
Browser
  └── React app
        ├── Google Identity Services (OAuth token)
        └── Drive REST API v3
              ├── treatments.json  (read/write on every change)
              └── MedicalExpenses/
                    └── {year}/{type}/{provider}/treatment-{DD-MM}-{id}/
                          ├── receipt.pdf
                          ├── approval_ins1.pdf
                          └── approval_ins2.pdf
```

---

## File Structure

```
src/
├── main.jsx                  Entry point — mounts React root
├── App.jsx                   Auth gate: shows SignIn or Dashboard
├── index.css                 Tailwind base styles
│
├── context/
│   └── AppContext.jsx         Global context — exposes auth + drive state
│
├── hooks/
│   ├── useGoogleAuth.js       OAuth 2.0 token lifecycle (GIS)
│   ├── useDrive.js            Load/save treatments.json
│   └── useUpload.js           Upload a local file to Drive with progress state
│
├── utils/
│   ├── driveApi.js            Raw Drive REST v3 calls (find, folder create, upload, CRUD)
│   ├── progressHelpers.js     5-step logic: computeSteps, isComplete, applyAutoSent
│   └── formatters.js          ₪ currency, date display, month key/label helpers
│
└── components/
    ├── SignIn.jsx              Google sign-in screen
    ├── Dashboard.jsx           Main view — toolbar, totals, chart, filters, table
    ├── TotalsPanel.jsx         Spent / Refunded / Outstanding summary cards
    ├── MonthlyChart.jsx        Recharts bar chart — spend vs refunds per month
    ├── FilterBar.jsx           Status / type / date range filter controls
    ├── TreatmentsTable.jsx     Sortable treatments list with inline progress steppers
    ├── ProgressStepper.jsx     5-step visual indicator (sm = mini dots, lg = full list)
    ├── TreatmentModal.jsx      Create / edit modal with file upload per step
    └── ConfirmDialog.jsx       Generic confirmation overlay (archive, delete)
```

---

## Context

### `AppContext` (`context/AppContext.jsx`)

Wraps the whole app. Provides a single `useApp()` hook that returns:

| Key | Type | Description |
|---|---|---|
| `auth` | object | Return value of `useGoogleAuth` |
| `drive` | object | Return value of `useDrive` |

Automatically calls `drive.load()` whenever `auth.accessToken` becomes available.

---

## Hooks

### `useGoogleAuth` (`hooks/useGoogleAuth.js`)

Manages the Google Identity Services token client.

**Returns:**

| Key | Type | Description |
|---|---|---|
| `accessToken` | `string \| null` | Current OAuth access token (also mirrored to `window.__accessToken` for use in fetch calls) |
| `loading` | `boolean` | True while the GIS library is initialising or a token request is in flight |
| `signIn()` | function | Triggers the OAuth consent / token popup |
| `signOut()` | function | Revokes the token and clears state |

**Scope:** `https://www.googleapis.com/auth/drive.file` — grants create/read/write access to files and folders the app created. No access to other Drive content.

---

### `useDrive` (`hooks/useDrive.js`)

Loads and persists the `treatments.json` file on Drive.

**Returns:**

| Key | Type | Description |
|---|---|---|
| `treatments` | `Treatment[]` | In-memory list of all treatments |
| `syncing` | `boolean` | True during any Drive read or write |
| `error` | `string \| null` | Last Drive error message |
| `load()` | async function | Fetch and parse `treatments.json` from Drive |
| `save(treatments)` | async function | Serialise and PUT the full array back to `treatments.json` |

Every mutation (create, edit, delete, archive, checkbox toggle) calls `save()` with the full updated array.

---

### `useUpload` (`hooks/useUpload.js`)

Handles uploading a local `File` object to the correct Drive folder for a treatment.

**Returns:**

| Key | Type | Description |
|---|---|---|
| `uploadFile(file, role, treatment)` | async function | Resolves the folder path, ensures the folder exists, uploads the file. Returns `{ fileId, name, role, folderPath }` |
| `uploading` | `{ [role]: boolean }` | Per-role upload-in-progress flags |
| `uploadError` | `string \| null` | Last upload error message |

Internally calls `uploadFileToDrive` from `driveApi.js`, which walks the folder path and creates missing folders before uploading.

---

## Utilities

### `driveApi.js`

All raw Drive REST v3 calls. Nothing React-specific.

| Export | Description |
|---|---|
| `computeFolderPath(treatment)` | Returns the Drive folder path string for a treatment. Uses `receiptId` as the identifier if set, otherwise falls back to the first 6 chars of the UUID. |
| `uploadFileToDrive(file, treatment)` | Ensures the full folder path exists (find-or-create each level), then uploads the file via multipart. Returns `{ fileId, name, folderPath }`. |
| `loadTreatments()` | Finds `treatments.json` on Drive and returns its parsed contents. Returns `{ version: 1, treatments: [] }` if the file doesn't exist yet. |
| `saveTreatments(data)` | Serialises `data` and PATCHes the existing `treatments.json`, or creates it if not found. |
| `driveViewUrl(fileId)` | Returns the `drive.google.com/file/d/{id}/view` URL for a file link. |

**Internal helpers (not exported):**

| Function | Description |
|---|---|
| `req(url, options)` | Thin fetch wrapper — injects `Authorization: Bearer` header, throws on non-OK responses |
| `findItem(name, parentId, mimeType)` | Searches Drive for a file/folder by name + optional parent + optional MIME type |
| `findOrCreateFolder(name, parentId)` | Returns the folder ID, creating it if it doesn't exist |
| `ensureFolderPath(pathParts)` | Walks an array of folder names from root, calling `findOrCreateFolder` at each level |

---

### `progressHelpers.js`

Pure functions — no side effects, no React.

| Export | Description |
|---|---|
| `computeSteps(treatment)` | Returns an array of 5 `{ label, done }` objects representing the reimbursement pipeline |
| `isComplete(treatment)` | `true` when all 5 steps are done |
| `isInProgress(treatment)` | `true` when at least 1 step is done but not all |
| `applyAutoSent(treatment)` | Returns a copy of the treatment with `sent_ins1`/`sent_ins2` forced `true` if the corresponding approval file exists |

`computeSteps` handles both the current data model (`files[]` array) and the legacy format (flat `receipt`/`approval_ins1`/`approval_ins2` fields) for backward compatibility.

---

### `formatters.js`

| Export | Description |
|---|---|
| `formatCurrency(amount)` | Formats a number as `₪1,234.56` using `he-IL` locale |
| `formatDate(iso)` | Converts `YYYY-MM-DD` → `DD/MM/YYYY` |
| `toISODate(date)` | Converts a `Date` object → `YYYY-MM-DD` string |
| `monthKey(iso)` | Extracts `YYYY-MM` from a `YYYY-MM-DD` string |
| `monthLabel(ym)` | Converts `YYYY-MM` → short month label e.g. `Apr '25` |

---

## Components

### `App.jsx`

Root component. Renders `<AppProvider>` wrapping an `<Inner>` component that switches between:
- Spinner (while GIS is loading)
- `<SignIn>` (no token)
- `<Dashboard>` (authenticated)

---

### `SignIn.jsx`

Full-screen centered card with a Google sign-in button. Calls `auth.signIn()` on click. Shown only when `auth.accessToken` is null.

---

### `Dashboard.jsx`

Main application shell. Owns:
- `filters` state (status / type / date range)
- `archiveMode` toggle
- Modal open/close state
- `handleSave`, `handleDelete`, `handleArchive` — all call `drive.save()` with the updated treatment array

**Layout (top to bottom):**
1. Sticky navbar — app name, sync indicator, Archive toggle, New Treatment button, Sign out
2. `<TotalsPanel>` + `<MonthlyChart>` (hidden in archive mode)
3. Archive mode banner (shown in archive mode)
4. `<FilterBar>`
5. `<TreatmentsTable>`
6. `<TreatmentModal>` (conditional)
7. `<ConfirmDialog>` for archive confirmation (conditional)

---

### `TotalsPanel.jsx`

Three summary cards — **Total Spent**, **Total Refunded**, **Outstanding**. Computed from non-archived treatments only.

**Props:** `treatments: Treatment[]`

---

### `MonthlyChart.jsx`

Recharts `<BarChart>` with two series (Spent in red, Refunded in green). Always shows the last 12 calendar months as baseline, extending further back if data exists before that window.

**Props:** `treatments: Treatment[]`

---

### `FilterBar.jsx`

Horizontal filter strip with three controls:
- Status select: All / Not Started / In Progress / Complete
- Type select: All / Physiotherapy / Other
- From / To month pickers

Shows a "Clear filters" link when any filter is active.

**Props:** `filters: object`, `onChange: (filters) => void`

---

### `TreatmentsTable.jsx`

Full-width table sorted by date descending. Each row:
- Shows date, type, provider, description (truncated), cost (₪), refunded (₪), mini progress stepper, status badge
- Clicking anywhere on the row opens the edit modal
- Separate Edit / Archive action buttons (Archive only shown when treatment is complete)

**Props:** `treatments: Treatment[]`, `onEdit: (t) => void`, `onArchive: (t) => void`

---

### `ProgressStepper.jsx`

Renders the 5-step pipeline in two sizes:

- **`size="sm"`** (default) — compact dot-and-line indicator used in the table
- **`size="lg"`** — vertical list with numbered circles used in the modal

Step state is derived by calling `computeSteps(treatment)` from `progressHelpers.js`.

**Props:** `treatment: Treatment`, `size?: 'sm' | 'lg'`

---

### `TreatmentModal.jsx`

Create / edit modal. Key behaviours:

- **New treatments** — pre-generates a UUID on mount so the Drive folder path can be computed before the treatment is saved
- **Folder preview** — shows the computed `MedicalExpenses/…` path live as the user types date / type / provider / receiptId
- **File upload** — each of the three file slots (`receipt`, `approval_ins1`, `approval_ins2`) has a hidden `<input type="file">` triggered by a button; calls `useUpload.uploadFile()` on selection
- **Auto-sent** — uploading `approval_ins1` automatically sets `sent_ins1 = true`; same for ins2
- **Save disabled** while any upload is in progress
- **Delete** shows a `<ConfirmDialog>` before calling `onDelete`
- Normalises old-format treatments (flat file fields) to the new `files[]` format on open

**Props:** `treatment: Treatment | null`, `onSave`, `onDelete`, `onClose`

---

### `ConfirmDialog.jsx`

Generic modal overlay for destructive confirmations.

**Props:** `title`, `message`, `onConfirm`, `onCancel`, `confirmLabel?`, `danger?: boolean`

---

## Data Flow

```
User action
    │
    ▼
Component (e.g. TreatmentModal)
    │  calls drive.save(updatedTreatments)
    ▼
useDrive.save()
    │  calls saveTreatments(data)
    ▼
driveApi.saveTreatments()
    │  PUT treatments.json on Drive
    ▼
Drive REST API  ←──────────────────────────────┐
                                               │
User uploads a file                            │
    │                                          │
    ▼                                          │
TreatmentModal → useUpload.uploadFile()        │
    │  calls uploadFileToDrive(file, treatment) │
    ▼                                          │
driveApi.uploadFileToDrive()                   │
    │  ensureFolderPath → findOrCreateFolder ──┘
    │  multipart POST file to Drive
    ▼
Returns { fileId, name, folderPath }
    │
    ▼
TreatmentModal adds entry to form.files[]
    │  user clicks Save
    ▼
drive.save() → treatments.json updated on Drive
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 Client ID from Google Cloud Console |
| `VITE_GOOGLE_API_KEY` | No | API Key (unused in current build; reserved for future use) |
