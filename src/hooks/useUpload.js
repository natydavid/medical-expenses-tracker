import { useState, useCallback } from 'react'
import { uploadFileToDrive, computeFolderPath } from '../utils/driveApi'

export function useUpload() {
  const [uploading, setUploading] = useState({})
  const [uploadError, setUploadError] = useState(null)

  // Upload a local File to the correct Drive folder for this treatment.
  // Returns { fileId, name, folderPath } on success.
  const uploadFile = useCallback(async (file, role, treatment) => {
    setUploading(u => ({ ...u, [role]: true }))
    setUploadError(null)
    try {
      const result = await uploadFileToDrive(file, treatment)
      return { fileId: result.fileId, name: result.name, role, folderPath: result.folderPath }
    } catch (e) {
      setUploadError(e.message)
      throw e
    } finally {
      setUploading(u => ({ ...u, [role]: false }))
    }
  }, [])

  return { uploadFile, uploading, uploadError }
}
