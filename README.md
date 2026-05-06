# Medical Expenses Tracker

A client-side React + Vite SPA for tracking personal medical treatments and reimbursements across two Israeli health insurers. The app owns your Google Drive — it uploads files, creates organised folders, and reads/writes a single `treatments.json` data file. No backend server required.

---

## Features

- **Google OAuth 2.0** sign-in — fully client-side, no server
- **Treatments table** with filters by status, type, and date range
- **5-step progress flow** per treatment (Receipt → Sent 1 → Approved 1 → Sent 2 → Approved 2)
- **File upload** — files are uploaded directly to an organised Drive folder hierarchy
- **Totals panel** — Spent / Refunded / Outstanding in ₪
- **Monthly bar chart** — Spent vs Refunded over the last 12 months
- **Archive mode** — completed treatments can be archived and hidden from the main view

---

## Drive Folder Structure

When a file is uploaded the app automatically creates this path in Google Drive:

```
MedicalExpenses/{year}/{treatmentType}/{provider}/treatment-{DD-MM}-{identifier}/
```

`{identifier}` is the **Receipt ID** if you entered one, otherwise the first 6 characters of the treatment's UUID.

**Examples:**
```
MedicalExpenses/2025/Physiotherapy/HaClinic/treatment-26-04-12345/receipt.pdf
MedicalExpenses/2025/Physiotherapy/HaClinic/treatment-26-04-12345/approval_ins1.pdf
MedicalExpenses/2025/Other/DrCohen/treatment-03-05-a3f9b2/receipt.pdf
```

Folders are created automatically (find-or-create per level) — you never touch Drive manually.

---

## Data Model

All data lives in `treatments.json` in the root of your Google Drive.

```jsonc
{
  "version": 1,
  "treatments": [
    {
      "id": "uuid-v4",
      "date": "YYYY-MM-DD",
      "type": "physiotherapy | other",
      "provider": "Clinic or practitioner name",
      "receiptId": "12345",           // optional — used as folder identifier
      "description": "Free-text notes",
      "cost": 350.00,                 // amount paid (₪)
      "refund_ins1": 120.00,          // refund from insurer 1 (₪)
      "refund_ins2": 80.00,           // refund from insurer 2 (₪)
      "archived": false,
      "driveFolder": "MedicalExpenses/2025/Physiotherapy/HaClinic/treatment-26-04-12345",
      "files": [
        { "role": "receipt",       "fileId": "drive-file-id", "name": "receipt.pdf" },
        { "role": "approval_ins1", "fileId": "drive-file-id", "name": "approval_maccabi.pdf" }
      ],
      "sent_ins1": true,
      "sent_ins2": false
    }
  ]
}
```

### File roles

| Role | Meaning |
|---|---|
| `receipt` | Proof of payment for the treatment |
| `approval_ins1` | Reimbursement approval from Insurer 1 |
| `approval_ins2` | Reimbursement approval from Insurer 2 |

### 5-Step progress logic

| Step | Label | How it's set |
|---|---|---|
| 1 | Receipt | `files` contains a `receipt` entry |
| 2 | Sent to Ins. 1 | Manual checkbox — auto-ticked when `approval_ins1` is uploaded |
| 3 | Approval Ins. 1 | `files` contains an `approval_ins1` entry |
| 4 | Sent to Ins. 2 | Manual checkbox — auto-ticked when `approval_ins2` is uploaded |
| 5 | Approval Ins. 2 | `files` contains an `approval_ins2` entry |

Removing an approval file does **not** un-tick the corresponding "Sent" checkbox.

---

## Setup

### 1. Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **Enable APIs**: Google Drive API.
3. **OAuth consent screen** → External → add your Gmail → add scope:
   - `https://www.googleapis.com/auth/drive.file`
4. **Credentials** → Create → **OAuth 2.0 Client ID** → Web application.
   - Authorized JavaScript origins: `http://localhost:5173` (add your production domain too).
   - Copy the **Client ID**.

### 2. Environment file

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173**, sign in with Google, and start tracking.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | JavaScript (ES modules, no TypeScript) |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Google Auth | Google Identity Services (GIS) — token flow |
| Google Storage | Drive REST API v3 (multipart upload, folder search/create) |
| State | React Context + hooks (no external state library) |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full component and data-flow reference.
