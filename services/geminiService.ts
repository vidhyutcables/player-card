import { GoogleGenAI } from "@google/genai";
import { PlayerData } from '../types';

export const getScoutReport = async (player: PlayerData): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not configured. Unable to generate scout report.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Write a short, exciting, sports-commentator style "Scout Report" (max 30 words) for a cricket player with the following stats. 
      Focus on their form and role. Make it sound like a trading card bio.
      
      Name: ${player.name}
      Role: ${player.role}
      Batting Style: ${player.battingStyle}
      Bowling Style: ${player.bowlingStyle}
      Form Rating (0-90): ${player.formNumber}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No report available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Scouting report currently unavailable.";
  }
};