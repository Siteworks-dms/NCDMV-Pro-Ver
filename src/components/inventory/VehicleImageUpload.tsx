import { useState, useRef } from 'react'
import { Upload, X, Image, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface VehicleImageUploadProps {
  vehicleId: string
  dealerId: string
  existingPhotos?: { id: string; public_url: string; position: number; is_primary: boolean }[]
  onUploaded?: () => void
}

export default function VehicleImageUpload({ vehicleId, dealerId, existingPhotos = [], onUploaded }: VehicleImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState(existingPhotos)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const ext  = file.name.split('.').pop()
      const path = `${dealerId}/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); continue }

      const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(path)
      const isPrimary = photos.length === 0

      const { data: photoRow, error: dbError } = await supabase
        .from('vehicle_photos')
        .insert({
          vehicle_id:   vehicleId,
          dealer_id:    dealerId,
          storage_path: path,
          public_url:   urlData.publicUrl,
          position:     photos.length,
          is_primary:   isPrimary,
        })
        .select('id, public_url, position, is_primary')
        .single()

      if (dbError) { toast.error('Failed to save photo record'); continue }

      setPhotos(prev => [...prev, photoRow])
      toast.success(isPrimary ? 'Primary photo uploaded' : 'Photo uploaded')
    }

    setUploading(false)
    onUploaded?.()
  }

  const handleDelete = async (photoId: string, storagePath: string) => {
    await supabase.storage.from('vehicle-photos').remove([storagePath])
    await supabase.from('vehicle_photos').delete().eq('id', photoId)
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    toast.success('Photo removed')
    onUploaded?.()
  }

  const setPrimary = async (photoId: string) => {
    await supabase.from('vehicle_photos').update({ is_primary: false }).eq('vehicle_id', vehicleId)
    await supabase.from('vehicle_photos').update({ is_primary: true }).eq('id', photoId)
    setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === photoId })))
    toast.success('Primary photo updated')
  }

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-xl p-5 text-center cursor-pointer transition-colors group"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-brand-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={20} className="mx-auto text-gray-300 group-hover:text-brand-400 mb-2 transition-colors" />
            <p className="text-sm text-gray-500 group-hover:text-brand-600">Click to upload vehicle photos</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Multiple allowed · First photo = primary</p>
          </>
        )}
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-video bg-gray-100">
              <img src={photo.public_url} alt="Vehicle" className="w-full h-full object-cover" />

              {/* Primary badge */}
              {photo.is_primary && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-brand-400 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                  <CheckCircle size={9} /> Primary
                </div>
              )}

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!photo.is_primary && (
                  <button
                    onClick={() => setPrimary(photo.id)}
                    className="bg-white/90 text-gray-700 text-xs px-2 py-1 rounded hover:bg-white"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleDelete(photo.id, photo.public_url)}
                  className="bg-red-500/90 text-white p-1.5 rounded hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Image size={13} /> No photos yet — upload is optional
        </div>
      )}
    </div>
  )
}
