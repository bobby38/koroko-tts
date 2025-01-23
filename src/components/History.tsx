import React, { useEffect, useState, useCallback } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { HistoryItem } from '@/types';
import { getHistoryItem } from '@/utils/db';

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

const AudioPlayer = React.memo(({ item }: { item: HistoryItem }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load audio data when component mounts
  useEffect(() => {
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        const result = await getHistoryItem(item.id);
        if (result?.audioData) {
          const blob = new Blob([result.audioData], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
      } catch (err) {
        console.error('Error loading audio:', err);
        setError('Failed to load audio');
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();

    // Cleanup function
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [item.id]);

  const handlePlay = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
      });
    }
  }, [audioUrl]);

  return (
    <div>
      {isLoading ? (
        <div className="h-12 flex items-center justify-center bg-gray-800 rounded">
          <p className="text-sm text-gray-400">Loading audio...</p>
        </div>
      ) : error ? (
        <div className="h-12 flex items-center justify-center bg-gray-800 rounded">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <audio
          ref={audioRef}
          controls
          src={audioUrl || undefined}
          onPlay={handlePlay}
          className="w-full"
        >
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

const HistoryItem = React.memo(({ item }: { item: HistoryItem }) => {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors">
      <p className="text-sm text-gray-400 mb-2">
        {formatDate(item.createdAt)}
      </p>
      <p className="text-gray-200 mb-3">{item.text}</p>
      <AudioPlayer item={item} />
    </div>
  );
});

HistoryItem.displayName = 'HistoryItem';

export default function History({ items, onClear }: Props) {
  if (!items?.length) {
    return (
      <div className="mt-8 text-center text-gray-400">
        <p>No history yet. Generate some speech to get started!</p>
      </div>
    );
  }

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
        {items.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
