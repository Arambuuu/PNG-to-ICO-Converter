/**
 * IcoGenerator - Pure Client-side PNG/Image to Multi-Resolution Windows ICO Converter
 * Compliant with Microsoft ICO format specification.
 * Supports both Modern PNG payloads and Classic 32-bit BMP DIB payloads with full alpha channel.
 */

class IcoGenerator {
  /**
   * Resize an image source (HTMLImageElement or ImageBitmap) to a square canvas of target size.
   * Supports 'contain' (pad with transparent background), 'cover' (center-crop), and 'stretch'.
   */
  static renderToCanvas(img, targetSize, options = {}) {
    const {
      fit = 'contain', // 'contain' | 'cover' | 'stretch'
      bgColor = null,   // null (transparent) or hex/rgb string '#ffffff'
      smoothingQuality = 'high'
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Configure high-quality resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = smoothingQuality;

    // Optional background fill
    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetSize, targetSize);
    } else {
      ctx.clearRect(0, 0, targetSize, targetSize);
    }

    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;

    let dx = 0;
    let dy = 0;
    let dw = targetSize;
    let dh = targetSize;

    if (fit === 'contain') {
      const scale = Math.min(targetSize / sw, targetSize / sh);
      dw = Math.round(sw * scale);
      dh = Math.round(sh * scale);
      dx = Math.round((targetSize - dw) / 2);
      dy = Math.round((targetSize - dh) / 2);
    } else if (fit === 'cover') {
      const scale = Math.max(targetSize / sw, targetSize / sh);
      dw = Math.round(sw * scale);
      dh = Math.round(sh * scale);
      dx = Math.round((targetSize - dw) / 2);
      dy = Math.round((targetSize - dh) / 2);
    }
    // fit === 'stretch' uses default dx=0, dy=0, dw=targetSize, dh=targetSize

    ctx.drawImage(img, dx, dy, dw, dh);
    return canvas;
  }

  /**
   * Convert canvas to PNG Uint8Array bytes
   */
  static canvasToPngBytes(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob from canvas'));
          return;
        }
        blob.arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      }, 'image/png');
    });
  }

  /**
   * Convert canvas to 32-bit BMP DIB (Device Independent Bitmap) bytes with AND transparency mask.
   * Maximum compatibility with legacy Windows icon readers.
   */
  static canvasToDibBytes(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data; // RGBA top-to-bottom

    const headerSize = 40; // BITMAPINFOHEADER size
    const xorSize = w * h * 4; // 32-bit BGRA
    const andRowBytes = Math.ceil(w / 32) * 4; // 1-bit per pixel, padded to 32-bit boundary
    const andSize = andRowBytes * h;
    const totalSize = headerSize + xorSize + andSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // BITMAPINFOHEADER
    view.setUint32(0, 40, true);       // biSize = 40
    view.setInt32(4, w, true);         // biWidth
    view.setInt32(8, h * 2, true);     // biHeight (height * 2 for combined XOR + AND masks)
    view.setUint16(12, 1, true);       // biPlanes = 1
    view.setUint16(14, 32, true);      // biBitCount = 32
    view.setUint32(16, 0, true);       // biCompression = BI_RGB (0)
    view.setUint32(20, xorSize + andSize, true); // biSizeImage
    view.setInt32(24, 0, true);        // biXPelsPerMeter
    view.setInt32(28, 0, true);        // biYPelsPerMeter
    view.setUint32(32, 0, true);       // biClrUsed
    view.setUint32(36, 0, true);       // biClrImportant

    // XOR image data: 32-bit BGRA, bottom-up row order
    let offset = headerSize;
    for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        bytes[offset++] = data[srcIdx + 2]; // Blue
        bytes[offset++] = data[srcIdx + 1]; // Green
        bytes[offset++] = data[srcIdx];     // Red
        bytes[offset++] = data[srcIdx + 3]; // Alpha
      }
    }

    // AND mask: 1 bit per pixel, bottom-up row order (1 = transparent, 0 = opaque)
    for (let y = h - 1; y >= 0; y--) {
      const rowStart = offset;
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const alpha = data[srcIdx + 3];
        if (alpha === 0) {
          const bytePos = rowStart + Math.floor(x / 8);
          const bitPos = 7 - (x % 8);
          bytes[bytePos] |= (1 << bitPos);
        }
      }
      offset += andRowBytes;
    }

    return bytes;
  }

  /**
   * Generates a multi-resolution .ico Blob from an image source and a list of target sizes.
   * @param {HTMLImageElement|ImageBitmap} img - The source image
   * @param {number[]} sizes - Array of sizes, e.g. [16, 32, 48, 64, 128, 256]
   * @param {Object} options - { fit, bgColor, format: 'hybrid' | 'png' | 'bmp' }
   * @returns {Promise<{ blob: Blob, canvases: Map<number, HTMLCanvasElement> }>}
   */
  static async generateIco(img, sizes = [16, 32, 48, 64, 128, 256], options = {}) {
    const {
      format = 'hybrid', // 'hybrid' (BMP <= 48, PNG >= 64) | 'png' | 'bmp'
      fit = 'contain',
      bgColor = null
    } = options;

    // Filter and sort sizes ascending
    const uniqueSizes = [...new Set(sizes)].filter((s) => s >= 8 && s <= 512).sort((a, b) => a - b);
    if (uniqueSizes.length === 0) {
      throw new Error('At least one valid icon size must be selected.');
    }

    const canvases = new Map();
    const imageEntries = [];

    // Render canvases and extract raw image bytes for each resolution
    for (const size of uniqueSizes) {
      const canvas = this.renderToCanvas(img, size, { fit, bgColor });
      canvases.set(size, canvas);

      let useDib = false;
      if (format === 'bmp') {
        useDib = true;
      } else if (format === 'hybrid') {
        // Use BMP DIB for smaller resolutions (classic Windows desktop/Explorer)
        // and PNG for 64px and above (saves file size, clean Vista/Win10/11 rendering)
        useDib = size <= 48;
      }

      let dataBytes;
      if (useDib) {
        dataBytes = this.canvasToDibBytes(canvas);
      } else {
        dataBytes = await this.canvasToPngBytes(canvas);
      }

      imageEntries.push({
        width: size,
        height: size,
        data: dataBytes
      });
    }

    // Build the binary ICO file
    const count = imageEntries.length;
    const headerLength = 6;
    const entryLength = 16;
    const directoryLength = count * entryLength;

    let totalDataLength = 0;
    for (const entry of imageEntries) {
      totalDataLength += entry.data.byteLength;
    }

    const buffer = new ArrayBuffer(headerLength + directoryLength + totalDataLength);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // 1. ICONDIR Header (6 bytes)
    view.setUint16(0, 0, true);       // Reserved: 0
    view.setUint16(2, 1, true);       // Type: 1 for ICO
    view.setUint16(4, count, true);   // Number of images

    // 2. ICONDIRENTRY list (16 bytes per entry)
    let currentDataOffset = headerLength + directoryLength;

    for (let i = 0; i < count; i++) {
      const entry = imageEntries[i];
      const entryOffset = headerLength + i * entryLength;

      // In ICO spec: 0 indicates 256 or larger
      const wByte = entry.width >= 256 ? 0 : entry.width;
      const hByte = entry.height >= 256 ? 0 : entry.height;

      view.setUint8(entryOffset + 0, wByte);          // bWidth
      view.setUint8(entryOffset + 1, hByte);          // bHeight
      view.setUint8(entryOffset + 2, 0);              // bColorCount (0 = no palette / 256+)
      view.setUint8(entryOffset + 3, 0);              // bReserved
      view.setUint16(entryOffset + 4, 1, true);       // wPlanes (1)
      view.setUint16(entryOffset + 6, 32, true);      // wBitCount (32 bpp)
      view.setUint32(entryOffset + 8, entry.data.byteLength, true); // dwBytesInRes
      view.setUint32(entryOffset + 12, currentDataOffset, true);    // dwImageOffset

      // Copy payload bytes into file buffer
      uint8.set(entry.data, currentDataOffset);
      currentDataOffset += entry.data.byteLength;
    }

    const icoBlob = new Blob([buffer], { type: 'image/x-icon' });
    return {
      blob: icoBlob,
      canvases
    };
  }
}

// Attach to window for standard script tag usage
if (typeof window !== 'undefined') {
  window.IcoGenerator = IcoGenerator;
}
