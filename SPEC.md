# Medical Expenses Tracker — Specification

## Overview

A single-page React + Vite web app for tracking personal medical treatments and reimbursements across two Israeli health insurers. All data lives in a single `treatments.json` file on Google Drive. Supporting documents (receipts, insurer approvals) are attached by browsing Google Drive and linking existing files — no file uploads from the local machine.

---

## Authentication

- Google OAuth 2.0 via the Google Identity Services (GIS) library (token-based, no server backend).
- Scopes required:
  - `https://www.googleapis.com/auth/drive.file` — read/write `treatments.json` (created by the app).
  - `https://www.googleapis.com/auth/drive.readonly` — browse Drive to pick attachment files.
- On first load, if no token exists the user sees a "Sign in with Google" screen.
- Token is kept in memory; the app re-authenticates silently on refresh using the GIS `requestAccessToken` flow.

---

## Data Storage

### File: `treatments.json` on Google Drive

One file, created in the user's Drive root on first save, updated on every change. The app finds it by name using the Drive API search; if not found, creates it.

### Top-level schema

```jsonc
{
  "version": 1,
  "treatments": [ /* Treatment[] */ ]
}
```

### Treatment object

```jsonc
{
  "id": "uuid-v4",
  "date": "YYYY-MM-DD",               // date of treatment
  "type": "physiotherapy | other",    // treatment category
  "provider": "string",               // clinic / practitioner name
  "description": "string",            // free-text notes
  "cost": 123.50,                     // amount paid (₪)
  "refund_ins1": 0,                   // refund received from insurer 1 (₪)
  "refund_ins2": 0,                   // refund received from insurer 2 (₪)
  "archived": false,                  // true once fully completed

  // Attached Google Drive file references (null if not attached)
  "receipt": {
    "fileId": "drive-file-id",
    "name": "receipt.pdf"
  } | null,
  "approval_ins1": {
    "fileId": "drive-file-id",
    "name": "approval_maccabi.pdf"
  } | null,
  "approval_ins2": {
    "fileId": "drive-file-id",
    "name": "approval_kupat.pdf"
  } | null,

  // Manual "sent" flags (auto-ticked when corresponding approval is attached)
  "sent_ins1": false,
  "sent_ins2": false
}
```

---

## Progress Flow

Each treatment has a 5-step pipeline displayed as a mini progress bar/stepper:

| Step | # | Label | How it's set |
|---|---|---|---|
| Receipt attached | 1 | Receipt | Inferred: `receipt !== null` |
| Sent to Ins. 1 | 2 | Sent 1 | Manual checkbox — OR auto-ticked when `approval_ins1 !== null` |
| Approval Ins. 1 received | 3 | Approved 1 | Inferred: `approval_ins1 !== null` |
| Sent to Ins. 2 | 4 | Sent 2 | Manual checkbox — OR auto-ticked when `approval_ins2 !== null` |
| Approval Ins. 2 received | 5 | Approved 2 | Inferred: `approval_ins2 !== null` |

A treatment is **complete** when all 5 steps are done (i.e., both approvals attached and both sent flags set). Completing a treatment surfaces an "Archive" prompt.

---

## UI / Pages

### 1. Sign-in Screen
- Centered Google sign-in button.
- Shown only when unauthenticated.

### 2. Dashboard (main view)

#### Toolbar
- App name / logo.
- "New Treatment" button (opens modal).
- Archive mode toggle (shows/hides archived treatments).
- Sign-out button.

#### Totals Panel (top of page)
Three summary cards:
- **Total Spent** — sum of `cost` across all non-archived treatments (₪).
- **Total Refunded** — sum of `refund_ins1 + refund_ins2` across all non-archived treatments (₪).
- **Outstanding** — Total Spent − Total Refunded (₪).

#### Monthly Bar Chart
- X-axis: months (last 12 months or all months present in data, whichever is longer).
- Two bar series per month: **Spent** (cost) and **Refunded** (refund_ins1 + refund_ins2).
- Library: Recharts.

#### Filter Bar
- Filter by **status**: All | In Progress | Complete.
- Filter by **type**: All | Physiotherapy | Other.
- Filter by **date range**: month/year pickers (from / to).
- Filters apply to the table below.

#### Treatments Table
Columns:
| Column | Content |
|---|---|
| Date | `YYYY-MM-DD` |
| Type | Physiotherapy / Other |
| Provider | Provider name |
| Description | Truncated free text |
| Cost | ₪ amount |
| Refunded | ₪ refund_ins1 + refund_ins2 |
| Progress | 5-step mini stepper |
| Actions | Edit / Archive (if complete) |

- Sorted by date descending by default.
- Clicking a row opens the Treatment Detail panel/modal.

### 3. Treatment Detail / Edit Modal

Sections:

**Basic Info** (editable)
- Date (date picker)
- Type (select: Physiotherapy | Other)
- Provider (text)
- Description (textarea)
- Cost ₪ (number)
- Refund Ins. 1 ₪ (number)
- Refund Ins. 2 ₪ (number)

**Progress Steps** (interactive)
Each step shown with its status icon and a control:
- Step 1 — Receipt: "Attach file" button → opens Drive Picker; shows linked file name + Drive link if attached; "Remove" button.
- Step 2 — Sent to Ins. 1: Checkbox (disabled & auto-checked if approval_ins1 is attached).
- Step 3 — Approval Ins. 1: "Attach file" button; shows linked file; "Remove".
- Step 4 — Sent to Ins. 2: Checkbox (disabled & auto-checked if approval_ins2 is attached).
- Step 5 — Approval Ins. 2: "Attach file" button; shows linked file; "Remove".

**Attached files** open in a new tab via their Google Drive view URL.

Actions: Save | Cancel | Delete (with confirmation).

### 4. Drive File Picker
- Uses the Google Picker API (loaded via script tag).
- Opens a Google Drive file browser in a popup.
- User navigates their Drive and selects one file.
- Returns `{ fileId, name }` to be stored in the treatment.
- Triggered from "Attach file" buttons in the detail modal.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | JavaScript (no TypeScript — keep it simple) |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Google APIs | GIS (`accounts.google.com/gsi/client`), Drive REST v3, Picker API v3 |
| State | React Context + `useReducer` (no external state library) |
| IDs | `crypto.randomUUID()` |
| Date handling | Native `Date` / `Intl` (no heavy library) |

---

## Key Behaviours & Rules

1. **Auto-tick "Sent" when approval attached**: saving `approval_ins1` always sets `sent_ins1 = true`; saving `approval_ins2` always sets `sent_ins2 = true`.
2. **Removing an approval does NOT untick sent**: the user manually sent something; removing the approval file shouldn't erase that fact.
3. **Archive**: only available when treatment is complete (all 5 steps done). Archived treatments are hidden in normal view and shown in archive mode. Archived treatments are excluded from the Totals panel.
4. **Persistence**: every save (new treatment, edit, archive) re-serializes the full `treatments` array and PUTs `treatments.json` on Drive.
5. **Offline**: no offline support; the app requires an active Google session and network.
6. **Currency**: always display as `₪X,XXX.XX` (Israeli Shekel symbol).
7. **No server**: fully client-side. Google OAuth client ID is configured via a `.env` file (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`).

---

## File / Folder Structure (planned)

```
medical_expenses/
├── .env.example
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── context/
    │   └── AppContext.jsx        # auth state, treatments state, Drive helpers
    ├── hooks/
    │   ├── useGoogleAuth.js
    │   ├── useDrive.js           # CRUD for treatments.json
    │   └── usePicker.js          # Google Picker API wrapper
    ├── components/
    │   ├── SignIn.jsx
    │   ├── Dashboard.jsx
    │   ├── TotalsPanel.jsx
    │   ├── MonthlyChart.jsx
    │   ├── FilterBar.jsx
    │   ├── TreatmentsTable.jsx
    │   ├── ProgressStepper.jsx   # mini 5-step indicator
    │   ├── TreatmentModal.jsx    # new / edit / detail
    │   └── ConfirmDialog.jsx
    └── utils/
        ├── driveApi.js           # raw Drive REST calls
        ├── formatters.js         # ₪ formatting, date helpers
        └── progressHelpers.js    # step completion logic
```

---

## Out of Scope

- Uploading files from local disk (Drive Picker only browses existing Drive files).
- Multi-user / sharing.
- Offline / PWA support.
- Backend server or database.
- More than two insurers.
- Mobile-optimised layout (desktop-first, but no explicit mobile breakpoints required).
