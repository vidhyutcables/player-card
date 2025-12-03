
export interface PlayerData {
  id: string;
  name: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  formNumber: number; // 01-90
  imageUrl: string;
  manualImage?: string; // Blob URL for individually uploaded images
}

export interface CardAssets {
  excelFile: File | null;
  agrasenImage: string | null; // Data URL
  logoImage: string | null; // Data URL
  localImageMap: Record<string, string>; // Map<Filename, BlobURL> for batch processing
}

export interface GeneratedCard {
  playerId: string;
  dataUrl: string; // The final PNG image
  scoutReport?: string;
}

export enum ProcessStatus {
  IDLE = 'idle',
  PARSING = 'parsing',
  REVIEW = 'review', // New status for checking player list before generation
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error'
}
