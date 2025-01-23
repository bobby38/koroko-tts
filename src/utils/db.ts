import { HistoryItem } from '@/types';

// Initialize IndexedDB
const initDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('kokoroTTS', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'id' });
      }
    };
  });
};

// Save audio data to IndexedDB
export const saveAudio = async (item: HistoryItem): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Get all history items
export const getAllHistory = async (): Promise<HistoryItem[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history'], 'readonly');
    const store = transaction.objectStore('history');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Delete a history item
export const deleteHistoryItem = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
