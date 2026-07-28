// Persists FileSystemFileHandles so re-opening a match video costs one click
// instead of navigating the filesystem again on every page load.
//
// The video never leaves the machine: a handball match is 1-3 GB against a 1 GB
// Supabase Storage quota and a 4.5 MB Vercel request limit, and Drive/YouTube
// embeds give no programmatic currentTime, which would kill seeking. Postgres
// stores the identity (name, size, duration, period offsets) and a handle_key;
// the browser stores the handle itself under that key.
//
// Raw IndexedDB rather than a wrapper library - it is one store and three
// operations, and structured clone handles FileSystemFileHandle natively.

const DB_NAME = "training-hub-video"
const DB_VERSION = 1
const STORE = "handles"

/**
 * Permission and picker APIs are Chromium-only and absent from lib.dom, so they
 * are declared narrowly here rather than pulling in a global shim.
 */
type PermissionState = "granted" | "denied" | "prompt"

interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

export interface VideoFileHandle extends FileSystemFileHandle {
  queryPermission?(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: FilePickerAcceptType[]
      multiple?: boolean
      excludeAcceptAllOption?: boolean
    }) => Promise<VideoFileHandle[]>
  }
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && typeof window.showOpenFilePicker === "function"
}

/** Null rather than throwing when IndexedDB is unavailable (SSR, private mode). */
function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null)
          return
        }
        try {
          const request = run(db.transaction(STORE, mode).objectStore(STORE))
          request.onsuccess = () => resolve(request.result ?? null)
          request.onerror = () => resolve(null)
        } catch {
          resolve(null)
        } finally {
          // Safe to close immediately: the transaction keeps the connection
          // alive until it settles.
          db.close()
        }
      })
  )
}

export async function putHandle(key: string, handle: VideoFileHandle): Promise<void> {
  await withStore("readwrite", (store) => store.put(handle, key) as IDBRequest<IDBValidKey>)
}

export async function getHandle(key: string): Promise<VideoFileHandle | null> {
  return withStore<VideoFileHandle>("readonly", (store) => store.get(key))
}

/**
 * Resolves a stored handle to a File without prompting, when the browser still
 * remembers the grant. Returns null when a user gesture is required - the caller
 * then has to render a button, because requestPermission outside a gesture is
 * rejected.
 */
export async function fileFromHandleIfPermitted(
  handle: VideoFileHandle
): Promise<File | null> {
  try {
    const state = (await handle.queryPermission?.({ mode: "read" })) ?? "granted"
    if (state !== "granted") return null
    return await handle.getFile()
  } catch {
    return null
  }
}

/** Must be called from inside a user gesture. */
export async function requestFileFromHandle(handle: VideoFileHandle): Promise<File | null> {
  try {
    const state = (await handle.requestPermission?.({ mode: "read" })) ?? "granted"
    if (state !== "granted") return null
    return await handle.getFile()
  } catch {
    return null
  }
}

export async function pickVideoFile(): Promise<{ handle: VideoFileHandle; file: File } | null> {
  if (!supportsFileSystemAccess()) return null
  try {
    const [handle] = await window.showOpenFilePicker!({
      types: [
        {
          description: "Match video",
          accept: { "video/*": [".mp4", ".mkv", ".mov", ".webm", ".m4v"] },
        },
      ],
      multiple: false,
    })
    if (!handle) return null
    return { handle, file: await handle.getFile() }
  } catch {
    // User cancelled the picker, or the API rejected it.
    return null
  }
}
