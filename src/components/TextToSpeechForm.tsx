import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { HistoryItem } from '@/types';

interface Props {
  onSuccess: (item: HistoryItem) => void;
}

const VOICE_OPTIONS = [
  // Default Voice
  { value: 'af', label: 'Default Voice (Bella & Sarah Mix)' },
  
  // American Female
  { value: 'af_bella', label: 'af_bella' },
  { value: 'af_sarah', label: 'af_sarah' },
  { value: 'af_nicole', label: 'af_nicole' },
  { value: 'af_sky', label: 'af_sky' },
  
  // American Male
  { value: 'am_adam', label: 'am_adam' },
  { value: 'am_michael', label: 'am_michael' },
  
  // British Female
  { value: 'bf_emma', label: 'bf_emma' },
  { value: 'bf_isabella', label: 'bf_isabella' },
  
  // British Male
  { value: 'bm_george', label: 'bm_george' },
  { value: 'bm_lewis', label: 'bm_lewis' }
];

export default function TextToSpeechForm({ onSuccess }: Props) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('af');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text.trim(),
          voice
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate speech');
      }

      if (!data.output) {
        throw new Error('No output received from server');
      }

      if (typeof data.output !== 'string' || !data.output.startsWith('http')) {
        console.error('Invalid audio URL:', data.output);
        throw new Error('Invalid audio URL received from server');
      }

      const historyItem: HistoryItem = {
        text: text.trim(),
        audioUrl: data.output,
        createdAt: new Date().toISOString()
      };

      onSuccess(historyItem);
      setText('');
      toast.success('Speech generated successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-2 text-white">Text to Speech Converter</h2>
      <p className="text-gray-400 mb-6 text-sm">
        Supports long-form text with automatic text splitting. This is a fork of the original Kokoro repo for Replicate inference.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-300 mb-1">
            Text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Enter text to convert to speech (supports long-form text)..."
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-gray-300 mb-1">
            Voice
          </label>
          <select
            id="voice"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            {VOICE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : 'Generate Speech'}
        </button>
      </form>
    </div>
  );
}
