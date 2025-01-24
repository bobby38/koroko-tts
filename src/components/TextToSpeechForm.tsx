import React, { useRef, useState } from 'react';
import type { TTSModel, KokoroVoice, HistoryItem } from '@/types';
import { saveAudio } from '@/utils/db';

interface Props {
  onSuccess: (item: HistoryItem) => void;
}

export default function TextToSpeechForm({ onSuccess }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState('');
  const [model, setModel] = useState<TTSModel>('kokoro');
  const [voice, setVoice] = useState<KokoroVoice>('af_bella');
  const [language, setLanguage] = useState('en');
  const [xttsVoice, setXttsVoice] = useState('female');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      formData.append('model', model);
      
      if (model === 'xtts') {
        formData.append('language', language);
        if (wavFile) {
          formData.append('speaker_wav', wavFile);
        } else {
          formData.append('voice', xttsVoice);
        }
      } else {
        formData.append('voice', voice);
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioData = await response.arrayBuffer();
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a temporary blob URL for immediate playback
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      const historyItem: HistoryItem = {
        id,
        text,
        audioUrl: '', // We'll set this when loading from IndexedDB
        model,
        voice,
        createdAt: new Date().toISOString(),
      };

      // Save audio data to IndexedDB
      await saveAudio(historyItem, audioData);

      // Update the history item with the temporary URL for immediate playback
      historyItem.audioUrl = audioUrl;
      onSuccess(historyItem);
      
      // Reset form
      setText('');
      setWavFile(null);
      if (formRef.current) {
        formRef.current.reset();
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWavFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setWavFile(null);
      return;
    }

    if (file.type !== 'audio/wav') {
      setError('Please select a valid WAV file');
      setWavFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('WAV file must be smaller than 10MB');
      setWavFile(null);
      return;
    }

    setWavFile(file);
    setError(null);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value as TTSModel;
    setModel(newModel);
    // Reset voice when switching models
    if (newModel === 'xtts') {
      setVoice('male' as KokoroVoice);
    } else {
      setVoice('af_bella');
    }
    setWavFile(null);
    setError(null);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="text" className="block text-sm font-medium text-gray-300">
          Text
        </label>
        <textarea
          id="text"
          name="text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Enter text to convert to speech..."
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="model" className="block text-sm font-medium text-gray-300">
          Model
        </label>
        <select
          id="model"
          name="model"
          value={model}
          onChange={handleModelChange}
          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={isLoading}
        >
          <option value="kokoro">Kokoro</option>
          <option value="xtts">XTTS</option>
        </select>
      </div>

      {model === 'xtts' && (
        <>
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-300">
              Language
            </label>
            <select
              id="language"
              name="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={isLoading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="pl">Polish</option>
              <option value="tr">Turkish</option>
              <option value="ru">Russian</option>
              <option value="nl">Dutch</option>
              <option value="cs">Czech</option>
              <option value="ar">Arabic</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <div>
            <label htmlFor="xttsVoice" className="block text-sm font-medium text-gray-300">
              Default Voice
            </label>
            <select
              id="xttsVoice"
              name="xttsVoice"
              value={xttsVoice}
              onChange={(e) => setXttsVoice(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={isLoading || wavFile !== null}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <p className="mt-1 text-sm text-gray-400">
              Select a default voice, or upload a custom voice below
            </p>
          </div>

          <div>
            <label htmlFor="wavFile" className="block text-sm font-medium text-gray-300">
              Custom Voice (WAV)
            </label>
            <input
              type="file"
              id="wavFile"
              accept="audio/wav"
              onChange={handleWavFileChange}
              className="mt-1 block w-full text-sm text-gray-300
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-600 file:text-white
                hover:file:bg-indigo-700"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-400">
              Optional: Upload a WAV file (max 10MB) to clone a specific voice
            </p>
          </div>
        </>
      )}

      {model === 'kokoro' && (
        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-gray-300">
            Voice
          </label>
          <select
            id="voice"
            name="voice"
            value={voice}
            onChange={(e) => setVoice(e.target.value as KokoroVoice)}
            className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            disabled={isLoading}
          >
            <option value="af_bella">Bella (Female)</option>
            <option value="af_sarah">Sarah (Female)</option>
            <option value="af_nicole">Nicole (Female)</option>
            <option value="af_sky">Sky (Female)</option>
            <option value="am_adam">Adam (Male)</option>
            <option value="am_michael">Michael (Male)</option>
            <option value="bf_emma">Emma (Female)</option>
            <option value="bf_isabella">Isabella (Female)</option>
            <option value="bm_george">George (Male)</option>
            <option value="bm_lewis">Lewis (Male)</option>
          </select>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm mt-2" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          isLoading
            ? 'bg-indigo-500 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          'Generate Speech'
        )}
      </button>
    </form>
  );
}
