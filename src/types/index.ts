export interface TTSRequest {
  text: string;
  voice?: string;
}

export interface TTSResponse {
  audio_url: string;
  created_at: string;
}

export interface HistoryItem {
  text: string;
  audioUrl: string;
  createdAt: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  value: string;
}
