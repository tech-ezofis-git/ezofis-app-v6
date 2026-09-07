const ALPHA_BG = 24
const COLOR_TOLERANCE = 40

type Rgba = { a: number; b: number; g: number; r: number }

const pixelAt = (data: Uint8ClampedArray, index: number): Rgba => ({
  a: data[index + 3],
  b: data[index + 2],
  g: data[index + 1],
  r: data[index],
})

const isLike = (pixel: Rgba, background: Rgba) => {
  if (pixel.a < ALPHA_BG) return true
  const delta =
    Math.abs(pixel.r - background.r) +
    Math.abs(pixel.g - background.g) +
    Math.abs(pixel.b - background.b)
  return delta <= COLOR_TOLERANCE
}

const averageCorners = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rgba => {
  const corners = [
    pixelAt(data, 0),
    pixelAt(data, (width - 1) * 4),
    pixelAt(data, (height - 1) * width * 4),
    pixelAt(data, ((height - 1) * width + (width - 1)) * 4),
  ]
  return {
    a: Math.round(corners.reduce((sum, pixel) => sum + pixel.a, 0) / 4),
    b: Math.round(corners.reduce((sum, pixel) => sum + pixel.b, 0) / 4),
    g: Math.round(corners.reduce((sum, pixel) => sum + pixel.g, 0) / 4),
    r: Math.round(corners.reduce((sum, pixel) => sum + pixel.r, 0) / 4),
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = src
  })

export const trimImageDataUrl = async (src: string) => {
  if (!src || !src.startsWith('data:image')) return src

  try {
    const image = await loadImage(src)
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!width || !height) return src

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return src

    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, width, height)
    const background = averageCorners(data, width, height)

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = pixelAt(data, (y * width + x) * 4)
        if (isLike(pixel, background)) continue
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }

    if (maxX < minX || maxY < minY) return src

    const pad = Math.round(Math.max(width, height) * 0.04)
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(width - 1, maxX + pad)
    maxY = Math.min(height - 1, maxY + pad)

    const cropWidth = maxX - minX + 1
    const cropHeight = maxY - minY + 1
    if (cropWidth >= width * 0.96 && cropHeight >= height * 0.96) {
      return src
    }

    const cropped = document.createElement('canvas')
    cropped.width = cropWidth
    cropped.height = cropHeight
    const croppedContext = cropped.getContext('2d')
    if (!croppedContext) return src
    croppedContext.drawImage(
      canvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    )
    return cropped.toDataURL('image/png')
  } catch {
    return src
  }
}
