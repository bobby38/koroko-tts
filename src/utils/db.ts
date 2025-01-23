import type { HistoryItem } from '@/types';

const DB_NAME = 'tts-history';
const DB_VERSION = 1;
const HISTORY_STORE = 'history';
const AUDIO_STORE = 'audio';

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create history store
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      
      // Create audio store
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Save audio data to IndexedDB
export async function saveAudio(item: HistoryItem, audioData: ArrayBuffer) {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction([HISTORY_STORE, AUDIO_STORE], 'readwrite');
      
      // Save history item
      const historyStore = transaction.objectStore(HISTORY_STORE);
      historyStore.put(item);
      
      // Save audio data
      const audioStore = transaction.objectStore(AUDIO_STORE);
      audioStore.put({
        id: item.id,
        audioData: audioData,
        timestamp: Date.now()
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
}

// Get history item with audio data
export async function getHistoryItem(id: string): Promise<{ audioData: ArrayBuffer } | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(AUDIO_STORE, 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// Get all history items
export async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(HISTORY_STORE, 'readonly');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// Clear all history items
export async function clearHistory() {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const transaction = db.transaction([HISTORY_STORE, AUDIO_STORE], 'readwrite');
      
      // Clear history store
      const historyStore = transaction.objectStore(HISTORY_STORE);
      historyStore.clear();
      
      // Clear audio store
      const audioStore = transaction.objectStore(AUDIO_STORE);
      audioStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
}
