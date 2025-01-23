import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { HistoryItem } from '@/types';
import { saveAudio } from '@/utils/db';

interface Props {
  onSuccess: (item: HistoryItem) => void;
}

const MODELS = [
  { label: 'Kokoro TTS', value: 'kokoro' },
  { label: 'XTTS v2', value: 'xtts' },
];

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Polish', value: 'pl' },
  { label: 'Turkish', value: 'tr' },
  { label: 'Russian', value: 'ru' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Czech', value: 'cs' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Hungarian', value: 'hu' },
  { label: 'Korean', value: 'ko' },
  { label: 'Hindi', value: 'hi' },
];

const KOKORO_VOICES = [
  { label: 'Bella (Afrikaans)', value: 'af_bella' },
  { label: 'Sarah (Afrikaans)', value: 'af_sarah' },
  { label: 'Nicole (Afrikaans)', value: 'af_nicole' },
  { label: 'Sky (Afrikaans)', value: 'af_sky' },
  { label: 'Adam (American)', value: 'am_adam' },
  { label: 'Michael (American)', value: 'am_michael' },
  { label: 'Emma (British)', value: 'bf_emma' },
  { label: 'Isabella (British)', value: 'bf_isabella' },
  { label: 'George (British)', value: 'bm_george' },
  { label: 'Lewis (British)', value: 'bm_lewis' },
];

const XTTS_VOICES = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
];

export default function TextToSpeechForm({ onSuccess }: Props) {
  const [text, setText] = useState('');
  const [model, setModel] = useState('kokoro');
  const [voice, setVoice] = useState('af_bella');
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const speakerWavRef = useRef<HTMLInputElement>(null);

  const voices = model === 'xtts' ? XTTS_VOICES : KOKORO_VOICES;

  // Update voice when model changes to ensure compatibility
  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    // Set default voice based on model
    setVoice(newModel === 'xtts' ? 'female' : 'af_bella');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Generating speech...');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          model,
          voice,
          language,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      const audioData = await response.arrayBuffer();
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a blob URL for immediate playback
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      const historyItem: HistoryItem = {
        id,
        text,
        audioUrl,
        model,
        voice,
        createdAt: new Date().toISOString(),
      };

      // Save audio data to IndexedDB
      await saveAudio(id, new Uint8Array(audioData));

      onSuccess(historyItem);
      formRef.current?.reset();
      setText('');
      toast.success('Speech generated successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to generate speech');
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-white mb-4">Text to Speech Tools</h2>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-lg font-medium text-gray-300">
            Enter Text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 block w-full rounded-md border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-base p-3 min-h-[120px]"
            placeholder="Type your text here..."
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label htmlFor="model" className="block text-lg font-medium text-gray-300">
              Select Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-base"
              disabled={isLoading}
            >
              {MODELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="voice" className="block text-lg font-medium text-gray-300">
              Choose Voice
            </label>
            <select
              id="voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-base"
              disabled={isLoading}
            >
              {voices.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-lg font-medium text-gray-300">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-base"
              disabled={isLoading || model === 'kokoro'}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-3 px-5 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${
              isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isLoading ? 'Generating...' : 'Generate Speech'}
          </button>
        </div>
      </form>
    </div>
  );
}
