import React, { useMemo, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { firebaseStorage } from '@/lib/firebase'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Camera, Upload } from 'lucide-react'

// Views required for reference avatar creation
const REQUIRED_VIEWS = [
  { key: 'front', label: 'Front' },
  { key: 'left', label: 'Left side' },
  { key: 'right', label: 'Right side' },
] as const

type ViewKey = typeof REQUIRED_VIEWS[number]['key']

type FileState = {
  file?: File
  previewUrl?: string
  uploading: boolean
  progress: number
  downloadUrl?: string
  error?: string
}

function FilePicker({
  label,
  accept = 'image/*',
  onChange,
  value,
  previewUrl,
  capture = true,
}: {
  label: string
  accept?: string
  onChange: (file: File | undefined) => void
  value?: File
  previewUrl?: string
  capture?: boolean
}) {
  const inputId = useMemo(() => `file-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2)}`,[label])
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground/90">{label}</label>
      <input
        id={inputId}
        className="hidden"
        type="file"
        accept={accept}
        capture={capture ? 'user' : undefined}
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      <label htmlFor={inputId} className="block cursor-pointer">
        <div className="relative w-full h-80 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors">
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} preview`} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-center px-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to upload {label.toLowerCase()}</p>
              <p className="text-xs text-gray-500">Or open camera on mobile <Camera className="inline w-4 h-4 ml-1 align-text-top" /></p>
            </div>
          )}
        </div>
      </label>
      {value && (
        <div className="text-xs text-muted-foreground truncate">{value.name}</div>
      )}
    </div>
  )
}

export default function CameoUpload() {
  const { user } = useAuth()

  const [states, setStates] = useState<Record<ViewKey, FileState>>({
    front: { uploading: false, progress: 0 },
    left: { uploading: false, progress: 0 },
    right: { uploading: false, progress: 0 },
  })

  const allSelected = useMemo(
    () => REQUIRED_VIEWS.every(({ key }) => !!states[key].file),
    [states]
  )

  const anyUploading = useMemo(
    () => REQUIRED_VIEWS.some(({ key }) => states[key].uploading),
    [states]
  )

  const handlePick = (key: ViewKey, file?: File) => {
    const isImage = file ? file.type.startsWith('image/') : true
    setStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        file,
        previewUrl: file && isImage ? URL.createObjectURL(file) : undefined,
        error: file && !isImage ? 'Please upload an image file' : undefined,
      },
    }))
  }

  const uploadOne = async (key: ViewKey, file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    const path = `faces/${user.uid}/reference/${key}.jpg`
    const storageRef = ref(firebaseStorage, path)

    const meta = { contentType: file.type || 'image/jpeg' }
    const task = uploadBytesResumable(storageRef, file, meta)

    return new Promise((resolve, reject) => {
      setStates((prev) => ({ ...prev, [key]: { ...prev[key], uploading: true, progress: 0, error: undefined } }))

      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
          setStates((prev) => ({ ...prev, [key]: { ...prev[key], progress: pct } }))
        },
        (err) => {
          console.error(err)
          setStates((prev) => ({ ...prev, [key]: { ...prev[key], uploading: false, error: err.message } }))
          reject(err)
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref)
            setStates((prev) => ({ ...prev, [key]: { ...prev[key], uploading: false, downloadUrl: url, progress: 100 } }))
            resolve(url)
          } catch (e: any) {
            setStates((prev) => ({ ...prev, [key]: { ...prev[key], uploading: false, error: e.message } }))
            reject(e)
          }
        }
      )
    })
  }

  const handleUploadAll = async () => {
    if (!user) {
      toast.error('Please log in to upload reference photos')
      return
    }
    if (!allSelected) {
      toast.error('Please select all three photos (Front, Left, Right).')
      return
    }

    try {
      const urls = await Promise.all(
        REQUIRED_VIEWS.map(({ key }) => uploadOne(key, states[key].file!))
      )
      toast.success('Reference photos uploaded successfully')

      // Optional: notify backend to create/update face profile (no-op persistence in server now)
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8787'
      try {
        await fetch(`${apiBase}/api/face-profiles`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            user_id: user.uid,
            references: {
              front: states.front.downloadUrl || urls[0],
              left: states.left.downloadUrl || urls[1],
              right: states.right.downloadUrl || urls[2],
            },
            created_at: new Date().toISOString(),
          }),
        })
      } catch (e) {
        // Non-blocking
        console.debug('face-profiles call skipped/failed', e)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed, please try again')
    }
  }

  return (
    <div className="w-full px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Cameo Images</CardTitle>
          <CardDescription>
            Provide three clear photos of your face: front, left side, and right side. These will be used to build your avatar reference library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-10 min-h-96">
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600">
                PNG or JPG, 1080x1080+ recommended. Keep a neutral expression, good lighting, and frame your face fully.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REQUIRED_VIEWS.map(({ key, label }) => (
                <div key={key} className="space-y-3">
                  <FilePicker
                    label={`${label} photo`}
                    onChange={(f) => handlePick(key, f)}
                    value={states[key].file}
                    previewUrl={states[key].previewUrl}
                    capture
                  />
                  {states[key].uploading && (
                    <Progress value={states[key].progress} />
                  )}
                  {states[key].error && (
                    <p className="text-sm text-red-500">{states[key].error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleUploadAll} disabled={!allSelected || anyUploading}>
              {anyUploading ? 'Uploading…' : 'Upload all'}
            </Button>
            {!allSelected && (
              <span className="text-sm text-muted-foreground">
                All three photos are required
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        Tips: Use good lighting, remove hats/glasses if possible, keep a neutral expression, and frame your face clearly.
      </div>
    </div>
  )
}
