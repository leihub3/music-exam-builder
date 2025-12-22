/**
 * File upload validation and handling utilities for Next.js API routes
 */

export interface FileUpload {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

/**
 * Validate audio file
 */
export function validateAudioFile(file: File): void {
  const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac']
  const maxSize = 50 * 1024 * 1024 // 50MB

  if (!allowedMimes.includes(file.type)) {
    throw new Error('Invalid file type. Only audio files are allowed.')
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 50MB.')
  }
}

/**
 * Validate notation file (MusicXML, PDF, images)
 */
export function validateNotationFile(file: File): void {
  const allowedMimes = [
    'application/pdf',
    'application/xml',
    'text/xml',
    'application/vnd.recordare.musicxml+xml',
    'application/vnd.recordare.musicxml',
    'application/zip', // For .mxl files
    'application/x-zip-compressed',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
  const allowedExts = ['.pdf', '.xml', '.musicxml', '.mxl', '.png', '.jpg', '.jpeg', '.gif', '.webp']
  const maxSize = 10 * 1024 * 1024 // 10MB

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!allowedMimes.includes(file.type) && !allowedExts.includes(ext)) {
    throw new Error('Invalid file type. Only MusicXML, PDF, or image files are allowed.')
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.')
  }
}

/**
 * Validate submission file
 */
export function validateSubmissionFile(file: File): void {
  const allowedMimes = [
    'application/pdf',
    'application/xml',
    'text/xml',
    'application/vnd.recordare.musicxml+xml',
    'application/vnd.recordare.musicxml',
    'image/png',
    'image/jpeg'
  ]
  const allowedExts = ['.pdf', '.xml', '.musicxml', '.mxl', '.png', '.jpg', '.jpeg']
  const maxSize = 20 * 1024 * 1024 // 20MB

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!allowedMimes.includes(file.type) && !allowedExts.includes(ext)) {
    throw new Error('Invalid file type for submission.')
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 20MB.')
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): void {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedMimes.includes(file.type)) {
    throw new Error('Invalid image file type.')
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.')
  }
}

/**
 * Convert File to FileUpload format (for compatibility with services)
 */
export async function fileToBuffer(file: File): Promise<FileUpload> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return {
    buffer,
    originalname: file.name,
    mimetype: file.type,
    size: file.size
  }
}



