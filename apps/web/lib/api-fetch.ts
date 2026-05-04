import { toast } from "sonner"

/**
 * Wrapper around fetch that shows a toast on non-ok responses.
 * Returns parsed JSON on success, null on error (toast already shown).
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  errorMessage?: string
): Promise<T | null> {
  try {
    const res = await fetch(url, options)
    if (!res.ok) {
      let message = errorMessage ?? "Request failed"
      try {
        const body = (await res.json()) as { error?: string; requestId?: string }
        if (body.error) message = body.error
        if (body.requestId) message = `${message} Reference: ${body.requestId}`
      } catch {
        // ignore JSON parse failures
      }
      toast.error(message)
      return null
    }
    // 204 No Content
    if (res.status === 204) return null
    return res.json() as Promise<T>
  } catch {
    toast.error(errorMessage ?? "Network error. Please check your connection.")
    return null
  }
}
