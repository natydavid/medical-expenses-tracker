# Medical Expenses Tracker

React + Vite SPA for tracking medical treatments and reimbursements across two Israeli health insurers. The app is the source of truth — it uploads files directly to Google Drive and organises them into a structured folder hierarchy automatically.

## Drive Folder Structure

Files are stored at:
```
MedicalExpenses/{year}/{treatmentType}/{provider}/treatment-{DD-MM}-{uuid6}/
```

Examples:
```
MedicalExpenses/2025/Physiotherapy/HaClinic/treatment-26-04-a3f9b2/receipt.pdf
MedicalExpenses/2025/Physiotherapy/HaClinic/treatment-26-04-a3f9b2/approval_ins1.pdf
MedicalExpenses/2025/Other/DrCohen/treatment-03-05-b7e1c4/receipt.pdf
```

Folders are created automatically via the Drive API if they don't exist.

## Data

All treatment records are stored in `treatments.json` in the root of your Google Drive. Uploaded files stay in their organised folders; the JSON stores only the Drive file IDs.

### Treatment object shape

```jsonc
{
  "id": "uuid-v4",
  "date": "YYYY-MM-DD",
  "type": "physiotherapy | other",
  "provider": "Clinic name",
  "description": "Notes",
  "cost": 350.00,
  "refund_ins1": 120.00,
  "refund_ins2": 80.00,
  "archived": false,
  "driveFolder": "MedicalExpenses/2025/Physiotherapy/HaClinic/treatment-26-04-a3f9b2",
  "files": [
    { "role": "receipt",       "fileId": "...", "name": "receipt.pdf" },
    { "role": "approval_ins1", "fileId": "...", "name": "approval_maccabi.pdf" }
  ],
  "sent_ins1": true,
  "sent_ins2": false
}
```

## Setup

### 1. Create Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **Enable APIs**: Drive API.
3. **OAuth consent screen** → External → add your Gmail → add scope:
   - `https://www.googleapis.com/auth/drive.file`
4. **Credentials** → Create → OAuth 2.0 Client ID → Web application.
   - Authorized JavaScript origins: `http://localhost:5173` (and your production domain).
   - Copy the **Client ID**.
5. **Credentials** → Create → API Key (optional — only needed if you re-add the Picker).

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:5173, sign in with Google, and start tracking.

## 5-Step Progress Flow

| Step | Trigger |
|---|---|
| 1. Receipt | File uploaded with role `receipt` |
| 2. Sent to Ins. 1 | Manual checkbox, or auto-ticked when approval_ins1 is uploaded |
| 3. Approval Ins. 1 | File uploaded with role `approval_ins1` |
| 4. Sent to Ins. 2 | Manual checkbox, or auto-ticked when approval_ins2 is uploaded |
| 5. Approval Ins. 2 | File uploaded with role `approval_ins2` |
