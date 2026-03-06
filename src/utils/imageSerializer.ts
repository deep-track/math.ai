/**
 * Utilities for serializing and deserializing File/Blob objects to/from base64
 * This allows File objects to be persisted in JSON (localStorage, backend)
 */

export interface SerializedImage {
  type: 'image';
  data: string; // base64 encoded
  mimeType: string;
  name?: string;
}

/**
 * Convert a File or Blob to a serializable base64 representation
 */
export async function serializeImage(file: File | Blob): Promise<SerializedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the base64 part (after "data:...;base64,")
      const base64 = result.split(',')[1] || result;
      resolve({
        type: 'image',
        data: base64,
        mimeType: file.type || 'image/png',
        name: file instanceof File ? file.name : undefined,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a serialized image back to a Blob
 */
export function deserializeImage(serialized: SerializedImage | any): Blob | null {
  if (!serialized || typeof serialized !== 'object') {
    return null;
  }

  if (serialized.type !== 'image' || !serialized.data) {
    return null;
  }

  try {
    // Convert base64 back to binary
    const binaryString = atob(serialized.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: serialized.mimeType || 'image/png' });
  } catch (error) {
    console.error('Failed to deserialize image:', error);
    return null;
  }
}

/**
 * Prepare messages for storage by converting File objects to base64
 */
export async function serializeMessagesForStorage(messages: any[]): Promise<any[]> {
  const results = [];

  for (const message of messages) {
    const serialized = { ...message };

    if (message.problem?.image && (message.problem.image instanceof File || message.problem.image instanceof Blob)) {
      try {
        serialized.problem = {
          ...message.problem,
          image: await serializeImage(message.problem.image),
        };
      } catch (error) {
        console.error('Failed to serialize image in message:', error);
        // Keep the message but without the image
        serialized.problem = {
          ...message.problem,
          image: undefined,
        };
      }
    }

    if (message.problem?.document && (message.problem.document instanceof File || message.problem.document instanceof Blob)) {
      try {
        serialized.problem = {
          ...message.problem,
          document: await serializeImage(message.problem.document),
        };
      } catch (error) {
        console.error('Failed to serialize document in message:', error);
        // Keep the message but without the document
        serialized.problem = {
          ...message.problem,
          document: undefined,
        };
      }
    }

    results.push(serialized);
  }

  return results;
}

/**
 * Restore messages from storage by converting base64 back to Blob objects
 */
export function deserializeMessagesFromStorage(messages: any[]): any[] {
  return messages.map((message) => {
    const deserialized = { ...message };

    // Restore image if it's a serialized object
    if (
      deserialized.problem?.image &&
      typeof deserialized.problem.image === 'object' &&
      deserialized.problem.image.type === 'image'
    ) {
      const blob = deserializeImage(deserialized.problem.image);
      deserialized.problem = {
        ...deserialized.problem,
        image: blob || undefined,
      };
    } else if (deserialized.problem?.image && !(deserialized.problem.image instanceof Blob)) {
      // If it's not a Blob and not a serialized format, discard it
      deserialized.problem = {
        ...deserialized.problem,
        image: undefined,
      };
    }

    // Restore document if it's a serialized object
    if (
      deserialized.problem?.document &&
      typeof deserialized.problem.document === 'object' &&
      deserialized.problem.document.type === 'image'
    ) {
      const blob = deserializeImage(deserialized.problem.document);
      deserialized.problem = {
        ...deserialized.problem,
        document: blob || undefined,
      };
    } else if (deserialized.problem?.document && !(deserialized.problem.document instanceof Blob)) {
      // If it's not a Blob and not a serialized format, discard it
      deserialized.problem = {
        ...deserialized.problem,
        document: undefined,
      };
    }

    return deserialized;
  });
}
