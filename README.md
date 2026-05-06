# Medical Expenses Tracker

React + Vite app — stores all data in `treatments.json` on your Google Drive.

## Setup

### 1. Create Google Cloud credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **Enable APIs**: Drive API, Picker API.
3. **OAuth consent screen** → External → add your Gmail, add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.readonly`
4. **Credentials** → Create → OAuth 2.0 Client ID → Web application.
   - Authorized JavaScript origins: `http://localhost:5173` (and your production domain).
   - Copy the **Client ID**.
5. **Credentials** → Create → API Key → restrict to Drive API + Picker API.
   - Copy the **API Key**.

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

## Data

All treatments are stored in `treatments.json` in the root of your Google Drive. Attached files (receipts, approvals) remain wherever they are in Drive — only their file IDs are stored in the JSON.
