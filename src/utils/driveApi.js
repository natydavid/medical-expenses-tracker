const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const DATA_FILE_NAME = 'treatments.json'

async function req(url, options = {}) {
  const token = window.__accessToken
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive API error ${res.status}: ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

// Generic file/folder search
async function findItem(name, parentId = null, mimeType = null) {
  let q = `name='${name.replace(/'/g, "\\'")}' and trashed=false`
  if (parentId) q += ` and '${parentId}' in parents`
  if (mimeType) q += ` and mimeType='${mimeType}'`
  const data = await req(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`)
  return data.files?.[0] ?? null
}

// Find a folder by name+parent, create it if it doesn't exist
async function findOrCreateFolder(name, parentId) {
  const existing = await findItem(name, parentId, 'application/vnd.google-apps.folder')
  if (existing) return existing.id
  const created = await req(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  return created.id
}

// Walk an array of folder names, creating each level as needed, return leaf folder ID
async function ensureFolderPath(pathParts) {
  let parentId = 'root'
  for (const part of pathParts) {
    parentId = await findOrCreateFolder(part, parentId)
  }
  return parentId
}

// Derive the canonical Drive folder path string from a treatment object
export function computeFolderPath(treatment) {
  const { date, type, provider, id, receiptId } = treatment
  const [yr, mo, dy] = (date || new Date().toISOString().slice(0, 10)).split('-')
  const typeNorm = type
    ? type.charAt(0).toUpperCase() + type.slice(1)
    : 'Other'
  const providerNorm = (provider || 'Unknown')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_֐-׿-]/g, '') // keep Hebrew chars too
    || 'Unknown'
  const ddMM = `${dy}-${mo}`
  // Prefer the receipt ID (unique per provider) over the UUID suffix
  const identifier = receiptId
    ? String(receiptId).trim().replace(/[^a-zA-Z0-9_-]/g, '')
    : (id || crypto.randomUUID()).replace(/-/g, '').slice(0, 6)
  return `MedicalExpenses/${yr}/${typeNorm}/${providerNorm}/treatment-${ddMM}-${identifier}`
}

// Upload a local File object to the treatment's folder in Drive
// Returns the new Drive file ID
export async function uploadFileToDrive(file, treatment) {
  const folderPath = treatment.driveFolder || computeFolderPath(treatment)
  const pathParts = folderPath.split('/')
  const folderId = await ensureFolderPath(pathParts)

  const meta = JSON.stringify({ name: file.name, parents: [folderId] })
  const form = new FormData()
  form.append('metadata', new Blob([meta], { type: 'application/json' }))
  form.append('file', file)

  const result = await req(`${UPLOAD_API}/files?uploadType=multipart`, {
    method: 'POST',
    body: form,
  })
  return { fileId: result.id, name: file.name, folderPath }
}

// treatments.json CRUD

async function findDataFile() {
  return findItem(DATA_FILE_NAME)
}

export async function loadTreatments() {
  const file = await findDataFile()
  if (!file) return { version: 1, treatments: [] }
  const text = await req(`${DRIVE_API}/files/${file.id}?alt=media`)
  try {
    return JSON.parse(text)
  } catch {
    return { version: 1, treatments: [] }
  }
}

export async function saveTreatments(data) {
  const body = JSON.stringify(data, null, 2)
  const blob = new Blob([body], { type: 'application/json' })
  const file = await findDataFile()

  if (file) {
    await req(`${UPLOAD_API}/files/${file.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: blob,
    })
  } else {
    const meta = JSON.stringify({ name: DATA_FILE_NAME, mimeType: 'application/json' })
    const form = new FormData()
    form.append('metadata', new Blob([meta], { type: 'application/json' }))
    form.append('file', blob)
    await req(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      body: form,
    })
  }
}

export function driveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`
}
