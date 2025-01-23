'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import TextToSpeechForm from '@/components/TextToSpeechForm';
import History from '@/components/History';
import { HistoryItem } from '@/types';

export default function Home() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('tts-history');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          // Validate each item in the history
          const validHistory = parsedHistory.filter((item): item is HistoryItem => {
            return (
              typeof item === 'object' &&
              item !== null &&
              typeof item.text === 'string' &&
              typeof item.audioUrl === 'string' &&
              typeof item.createdAt === 'string'
            );
          });
          setHistory(validHistory);
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
      localStorage.removeItem('tts-history');
    }
  }, []);

  const addToHistory = (item: HistoryItem) => {
    if (!item || typeof item !== 'object') {
      console.error('Invalid history item:', item);
      return;
    }

    const { text, audioUrl, createdAt } = item;
    if (!text || !audioUrl || !createdAt) {
      console.error('Missing required fields in history item:', item);
      return;
    }

    const newItem: HistoryItem = {
      text: String(text),
      audioUrl: String(audioUrl),
      createdAt: String(createdAt)
    };

    setHistory(prevHistory => {
      const newHistory = [newItem, ...prevHistory];
      try {
        localStorage.setItem('tts-history', JSON.stringify(newHistory));
      } catch (error) {
        console.error('Error saving history:', error);
      }
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('tts-history');
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Kokoro Text-to-Speech
          </h1>
          <p className="text-lg text-gray-400">
            Convert your text to natural-sounding speech using Kokoro TTS
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TextToSpeechForm onSuccess={addToHistory} />
          <History items={history} onClear={clearHistory} />
        </div>
      </div>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
          },
        }}
      />
    </main>
  );
}
