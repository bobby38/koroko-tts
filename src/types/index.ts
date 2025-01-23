export interface TTSRequest {
  text: string;
  voice?: string;
}

export interface TTSResponse {
  audio_url: string;
  created_at: string;
}

export type TTSModel = 'kokoro' | 'xtts';

export type KokoroVoice = 
  | 'af_bella'
  | 'af_sarah'
  | 'af_nicole'
  | 'af_sky'
  | 'am_adam'
  | 'am_michael'
  | 'bf_emma'
  | 'bf_isabella'
  | 'bm_george'
  | 'bm_lewis';

export interface HistoryItem {
  id: string;
  text: string;
  audioUrl: string;
  model: TTSModel;
  voice: KokoroVoice;
  createdAt: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  value: string;
}
