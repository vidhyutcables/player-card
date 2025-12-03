import * as XLSX from 'xlsx';
import { PlayerData } from '../types';

export const parseExcelFile = async (file: File): Promise<PlayerData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(sheet);
        
        // Map and Validate
        const players: PlayerData[] = rawData.map((row: any, index) => ({
          id: `player-${index}`,
          name: row['Player Name'] || 'Unknown',
          role: row['Role'] || 'All Rounder',
          battingStyle: row['Batting Style'] || 'N/A',
          bowlingStyle: row['Bowling Style'] || 'N/A',
          formNumber: parseInt(row['Form Number']) || 50,
          imageUrl: row['Image URL'] || '',
        }));

        resolve(players);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};