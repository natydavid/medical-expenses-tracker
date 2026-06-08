# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (http://localhost:5173)
npm run build     # production build
npm run preview   # serve production build locally
```

There are no tests. There is no linter configured.

## Environment setup

Copy `.env.example` to `.env` and fill in both values before running:

```
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_API_KEY=...
```

The Google OAuth client must have `http://localhost:5173` as an authorised JavaScript origin.

## Architecture

**Fully client-side SPA** — no server, no database. All data lives in a single `treatments.json` file in the user's Google Drive root.

### State & auth flow

`AppContext` (`src/context/AppContext.jsx`) composes two hooks and exposes them as `{ auth, drive }`:

- **`useGoogleAuth`** (`src/hooks/useGoogleAuth.js`) — wraps Google Identity Services (GIS). Token is persisted in `localStorage` (`med_access_token` / `med_token_expiry`) and mirrored to `window.__accessToken` so that Drive API calls can read it synchronously without awaiting React state. `loading` is only true when there is no stored token and the app must wait for GIS to initialise.
- **`useDrive`** (`src/hooks/useDrive.js`) — thin CRUD layer. `load()` fetches `treatments.json`; `save(treatments[])` serialises and PUTs it back. Every mutation calls `save` with the full updated array.

`App.jsx` gates rendering: unauthenticated → `<SignIn>`; authenticated but not loaded → spinner or error; loaded → `<Dashboard>`.

### Data model

Each treatment has a `files` array of `{ role, fileId, name }` where `role` is `receipt | approval_ins1 | approval_ins2`. Older records used flat `receipt` / `approval_ins1` / `approval_ins2` fields — `progressHelpers.getFiles()` and `TreatmentModal.normalise()` convert these on the fly; never write the old format for new records.

`insurers` field (1 or 2, default 2) controls whether Insurer 2 steps and fields appear.

### Drive folder structure

Files uploaded from a treatment are stored under:
```
MedicalExpenses/{year}/{Type}/{Provider}/treatment-{dd-MM}-{identifier}
```
`computeFolderPath(treatment)` in `src/utils/driveApi.js` derives this path. The path is stored as `treatment.driveFolder`. When path-affecting fields (date, type, provider, receiptId) change on save, `Dashboard.handleSave` calls `moveTreatmentFiles` to relocate existing Drive files. Deleting a treatment calls `deleteTreatmentFolder` to clean up Drive.

All Drive REST calls go through the `req()` helper in `src/utils/driveApi.js`, which reads `window.__accessToken`.

### Progress logic

`src/utils/progressHelpers.js` exports:
- `computeSteps(treatment)` — returns 3 or 5 steps depending on `insurers`
- `isComplete` / `isInProgress` — derived from `computeSteps`
- `applyAutoSent(treatment)` — auto-sets `sent_ins1`/`sent_ins2` when corresponding approval files are present

### Key component responsibilities

| Component | Role |
|---|---|
| `Dashboard.jsx` | Filter state, archive mode, save/delete/archive handlers, modal orchestration |
| `TreatmentModal.jsx` | New/edit form, file upload rows, sent checkboxes, calls `useUpload` |
| `TotalsPanel.jsx` | Sums cost/refunds across non-archived treatments |
| `MonthlyChart.jsx` | Recharts bar chart — spent vs refunded per month |
| `FilterBar.jsx` | Status/type/date-range filters |
| `TreatmentsTable.jsx` | Table with `ProgressStepper` per row |

### Currency & dates

Always format amounts with `formatCurrency()` from `src/utils/formatters.js` (renders `₪X,XXX.XX` using `he-IL` locale). Dates are stored as `YYYY-MM-DD` strings; display uses `formatDate()` (renders `DD/MM/YYYY`). Use native `Date`/`Intl` — no date library.
