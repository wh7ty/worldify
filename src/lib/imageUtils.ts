const MAX_BYTES = 777 * 1024
const MAX_DIMENSION = 1920

export async function compressIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)

      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

      const toBlob = (quality: number): Promise<Blob> =>
        new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality))

      // Binary search: find highest quality that still fits in MAX_BYTES
      let lo = 0.1
      let hi = 0.92
      let result = await toBlob(lo)

      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2
        const blob = await toBlob(mid)
        if (blob.size <= MAX_BYTES) {
          result = blob
          lo = mid
        } else {
          hi = mid
        }
      }

      const name = file.name.replace(/\.[^.]+$/, '.jpg')
      resolve(new File([result], name, { type: 'image/jpeg' }))
    }

    img.src = objectUrl
  })
}
