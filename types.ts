export interface PlayerData {
  id: string;
  name: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  formNumber: number; // 01-90
  imageUrl: string;
}

export interface CardAssets {
  excelFile: File | null;
  agrasenImage: string | null; // Data URL
  logoImage: string | null; // Data URL
}

export interface GeneratedCard {
  playerId: string;
  dataUrl: string; // The final PNG image
  scoutReport?: string;
}

export enum ProcessStatus {
  IDLE = 'idle',
  PARSING = 'parsing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error'
}