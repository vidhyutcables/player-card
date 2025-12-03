
import * as XLSX from 'xlsx';
import { PlayerData } from '../types';

/**
 * Converts Google Drive sharing URLs to direct image source URLs
 * Uses the Thumbnail API which is often more CORS-friendly for Canvas operations.
 */
const transformGoogleDriveUrl = (url: string): string => {
  if (!url) return '';
  
  // Clean string
  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Optimization: If it looks like a filename, return it as is (for local matching)
  if (!cleanUrl.startsWith('http') && (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.png') || cleanUrl.indexOf('.') === -1)) {
      return cleanUrl;
  }

  // If it's already a thumbnail URL, return it
  if (cleanUrl.includes('drive.google.com/thumbnail')) return cleanUrl;

  let fileId = '';

  // Regex patterns to find Drive File IDs
  // 1. /file/d/ID/view or /file/d/ID
  // 2. id=ID
  // 3. /open?id=ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      fileId = match[1];
      break;
    }
  }

  if (fileId) {
    // Requesting width=1000 to get a high quality image. 
    // Using sz=w1000 is the standard parameter for this endpoint.
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  
  return cleanUrl;
};

/**
 * Helper to get value from a row using fuzzy matching for keys
 * Checks multiple possible header names and ignores case/whitespace
 */
const getRowValue = (row: any, possibleKeys: string[]): string | undefined => {
  const rowKeys = Object.keys(row);
  
  // 1. Try exact match first
  for (const key of possibleKeys) {
    if (row[key] !== undefined) return String(row[key]).trim();
  }

  // 2. Try case-insensitive / trimmed match
  for (const key of possibleKeys) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
    const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/\s+/g, '') === normalizedKey);
    if (foundKey && row[foundKey] !== undefined) {
      return String(row[foundKey]).trim();
    }
  }

  return undefined;
};

export const parseExcelFile = async (file: File): Promise<PlayerData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Use 'array' type for ArrayBuffer which is safer for xlsx files than binary string
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames.length) {
          throw new Error("Excel file appears to be empty (no sheets found).");
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(sheet);
        
        if (!rawData || rawData.length === 0) {
             throw new Error("No data found in the first sheet. Please check the file content.");
        }
        
        console.log("Raw Excel Data:", rawData); // Debug log

        // Map and Validate with Fuzzy Matching
        const players: PlayerData[] = rawData.map((row: any, index) => {
          
          const rawName = getRowValue(row, ['Player Name', 'Name', 'Player']) || 'Unknown';
          const rawRole = getRowValue(row, ['Role', 'Position']) || 'All Rounder';
          const rawBat = getRowValue(row, ['Batting Style', 'Batting']) || 'N/A';
          const rawBowl = getRowValue(row, ['Bowling Style', 'Bowling']) || 'N/A';
          const rawForm = getRowValue(row, ['Form Number', 'Form', 'Rating', 'OVR']) || '50';
          let rawUrl = getRowValue(row, ['Image URL', 'Image', 'Photo', 'Picture', 'Url', 'Link']) || '';

          // Auto-fix Google Drive Links (or leave as filename if local)
          rawUrl = transformGoogleDriveUrl(rawUrl);

          return {
            id: `player-${index}`,
            name: rawName,
            role: rawRole,
            battingStyle: rawBat,
            bowlingStyle: rawBowl,
            formNumber: parseInt(rawForm) || 50,
            imageUrl: rawUrl,
          };
        });

        if (players.length === 0) {
            throw new Error("Could not parse any players. Please ensure headers match the template.");
        }

        console.log("Parsed Players:", players); // Debug log
        resolve(players);
      } catch (err) {
        console.error("Excel Parse Error:", err);
        reject(err instanceof Error ? err : new Error("Failed to parse Excel file"));
      }
    };

    reader.onerror = (err) => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};

export const downloadTemplate = () => {
    const headers = [
      {
        "Player Name": "Virat Kohli",
        "Role": "Batsman",
        "Batting Style": "Right Handed Bat",
        "Bowling Style": "Right-arm medium",
        "Form Number": 96,
        "Image URL": "kohli.jpg"
      },
      {
        "Player Name": "Sample Bowler",
        "Role": "Bowler",
        "Batting Style": "Left Handed Bat",
        "Bowling Style": "Left-arm fast",
        "Form Number": 88,
        "Image URL": "bowler_1"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Player_Card_Template.xlsx");
};
