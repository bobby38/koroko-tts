import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { HistoryItem } from '@/types';

interface Props {
  items: HistoryItem[];
  onClear: () => void;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export default function History({ items, onClear }: Props) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-400">
        <p>No history yet. Generate some speech to get started!</p>
      </div>
    );
  }

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>, audioUrl: string) => {
    console.error('Audio playback error for URL:', audioUrl);
    const audioElement = e.currentTarget;
    if (audioElement.error) {
      console.error('Audio element error:', audioElement.error.message);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">History</h2>
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
          Clear History
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors"
          >
            <p className="text-sm text-gray-400 mb-2">
              {formatDate(item.createdAt)}
            </p>
            <p className="text-gray-200 mb-3">{item.text}</p>
            {item.audioUrl ? (
              <div>
                <audio
                  controls
                  className="w-full"
                  onError={(e) => handleAudioError(e, item.audioUrl)}
                  key={item.audioUrl}
                >
                  <source src={item.audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <p className="text-xs text-gray-500 mt-1 break-all">
                  Audio URL: {item.audioUrl}
                </p>
              </div>
            ) : (
              <p className="text-red-400 text-sm">Audio not available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
