export async function extractHttpErrorMessage(error: any, fallback: string): Promise<string> {
  const serverPayload = error?.error;

  if (typeof serverPayload === 'string' && serverPayload.trim()) {
    return serverPayload;
  }

  if (serverPayload instanceof Blob) {
    try {
      const text = await serverPayload.text();
      const parsed = JSON.parse(text);
      return parsed?.message || parsed?.error || text || fallback;
    } catch {
      try {
        const text = await serverPayload.text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  }

  return error?.error?.message || error?.message || fallback;
}

export function downloadBlobFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
