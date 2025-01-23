'use client';

import { useState, useEffect } from 'react';
import TextToSpeechForm from '@/components/TextToSpeechForm';
import History from '@/components/History';
import { HistoryItem } from '@/types';
import { getAllHistory, clearHistory } from '@/utils/db';

export default function Home() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const items = await getAllHistory();
      setHistory(items);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const handleSuccess = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Text to Speech</h1>
        <div>
          <TextToSpeechForm onSuccess={handleSuccess} />
          <History items={history} onClear={handleClearHistory} />
        </div>
      </div>
    </main>
  );
}
