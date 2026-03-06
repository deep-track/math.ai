/**
 * Safe image display utility that handles multiple image formats
 * Fixes the "createObjectURL" error by properly detecting and handling
 * Blobs, base64 strings, and serialized image objects
 */

/**
 * Safely get an image URL that can be used in <img src={} />
 * Handles File/Blob objects, base64 data URLs, and serialized image objects
 */
export function getSafeImageUrl(
  image: File | Blob | string | any,
  messageId?: string,
  imageCache?: Map<string, string>
): string | null {
  if (!image) {
    return null;
  }

  // Case 1: Direct base64 data URL string (most common after reload)
  if (typeof image === 'string') {
    if (image.startsWith('data:')) {
      return image; // Already a data URL, use directly
    }
    if (image.startsWith('blob:')) {
      return image; // Blob URL (same session only)
    }
    // Raw base64 without prefix? (shouldn't happen but handle it)
    if (image.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/jpeg;base64,${image}`;
    }
    return null;
  }

  // Case 2: Already a Blob or File object (fresh upload or properly deserialized)
  if (image instanceof Blob || image instanceof File) {
    // Check cache first
    if (messageId && imageCache?.has(messageId)) {
      return imageCache.get(messageId)!;
    }

    try {
      const url = URL.createObjectURL(image);
      if (messageId && imageCache) {
        imageCache.set(messageId, url);
      }
      return url;
    } catch (error) {
      console.error('[IMAGE] Failed to create object URL for Blob:', error);
      return null;
    }
  }

  // Case 3: Serialized image object {type: 'image', data: 'base64...', mimeType: '...'}
  if (typeof image === 'object' && image.type === 'image' && image.data) {
    try {
      // Convert base64 to data URL
      const mimeType = image.mimeType || 'image/png';
      return `data:${mimeType};base64,${image.data}`;
    } catch (error) {
      console.error('[IMAGE] Failed to process serialized image:', error);
      return null;
    }
  }

  // Case 4: Unknown type - log and return null
  console.warn('[IMAGE] Unrecognized image type:', typeof image, image);
  return null;
}

/**
 * Create and cache object URLs for Blobs/Files
 * Automatically tracks created URLs for cleanup
 */
export class ImageUrlManager {
  private cache = new Map<string, string>();

  /**
   * Get or create an object URL for a message's image
   * @param messageId Unique identifier for the message
   * @param image The image (Blob, File, base64 string, or serialized object)
   * @returns A usable image URL or null
   */
  getUrl(messageId: string, image: any): string | null {
    if (!image) return null;

    // Use safe display helper
    const url = getSafeImageUrl(image, messageId, this.cache);

    // Track it for later cleanup
    if (url && messageId) {
      this.cache.set(messageId, url);
    }

    return url;
  }

  /**
   * Revoke all cached blob: URLs to prevent memory leaks
   * Call this on component unmount
   */
  cleanup() {
    for (const [, url] of this.cache) {
      if (url?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('[IMAGE] Error revoking URL:', error);
        }
      }
    }
    this.cache.clear();
  }

  /**
   * Revoke a specific URL
   */
  revokeUrl(messageId: string) {
    const url = this.cache.get(messageId);
    if (url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('[IMAGE] Error revoking URL:', error);
      }
    }
    this.cache.delete(messageId);
  }
}

/**
 * Sanitize messages loaded from storage by handling dead blob URLs
 * @param messages Messages from localStorage/backend
 * @returns Sanitized messages with dead blob URLs removed
 */
export function sanitizeLoadedMessages(messages: any[]): any[] {
  return messages.map((message) => {
    if (!message.problem?.image) {
      return message;
    }

    const { image } = message.problem;

    // Dead blob URLs from previous browser sessions should be removed
    if (typeof image === 'string' && image.startsWith('blob:')) {
      console.warn('[IMAGE] Stripping dead blob URL from loaded message:', image);
      return {
        ...message,
        problem: {
          ...message.problem,
          image: undefined,
        },
      };
    }

    return message;
  });
}

/**
 * Debug helper: log image state at different stages
 */
export function debugImageState(label: string, image: any) {
  let typeDesc = 'unknown';
  let valuePreview = '';

  if (!image) {
    typeDesc = 'null/undefined';
  } else if (image instanceof Blob) {
    typeDesc = `Blob(${image.size} bytes, ${image.type})`;
  } else if (image instanceof File) {
    typeDesc = `File(${image.name}, ${image.size} bytes)`;
  } else if (typeof image === 'string') {
    valuePreview = image.slice(0, 80);
    if (image.startsWith('data:')) {
      typeDesc = 'Data URL';
    } else if (image.startsWith('blob:')) {
      typeDesc = 'Blob URL';
    } else {
      typeDesc = 'String';
    }
  } else if (typeof image === 'object') {
    typeDesc = `Object(${image.type || 'unknown'})`;
    if (image.data) {
      valuePreview = image.data.slice(0, 80);
    }
  }

  const fullMsg =
    `[IMAGE DEBUG] ${label}: ${typeDesc}` +
    (valuePreview ? ` value: ${valuePreview}...` : '');
  console.log(fullMsg);
}
