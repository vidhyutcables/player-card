import { PlayerData } from '../types';

// Dimensions for a high-quality card output
const CARD_WIDTH = 600;
const CARD_HEIGHT = 850;

/**
 * Loads an image from a URL or Data URI
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.warn(`Failed to load image: ${src}`, e);
      // Return a placeholder or transparent pixel instead of rejecting to keep app alive
      const placeholder = new Image();
      placeholder.src = "https://placehold.co/400x400/2a0e45/ffd700?text=No+Image"; 
      placeholder.onload = () => resolve(placeholder);
    };
    img.src = src;
  });
};

/**
 * Draws a rounded rectangle path
 */
const drawShieldPath = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.beginPath();
  // FIFA/FUT Shield Shape approximation
  ctx.moveTo(w * 0.1, h * 0.1); // Top Left
  ctx.lineTo(w * 0.9, h * 0.1); // Top Right
  ctx.lineTo(w * 0.9, h * 0.7); // Side Right down
  ctx.quadraticCurveTo(w * 0.9, h * 0.85, w * 0.5, h * 0.95); // Bottom point
  ctx.quadraticCurveTo(w * 0.1, h * 0.85, w * 0.1, h * 0.7); // Side Left up
  ctx.closePath();
};

export const generateCard = async (
  player: PlayerData,
  agrasenUrl: string,
  logoUrl: string
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Assets Loading
  const [playerImg, agrasenImg, logoImg] = await Promise.all([
    loadImage(player.imageUrl),
    loadImage(agrasenUrl),
    loadImage(logoUrl)
  ]);

  // 2. Background (Purple/Galaxy Texture)
  drawShieldPath(ctx, CARD_WIDTH, CARD_HEIGHT);
  ctx.clip(); // Constrain everything to shield shape

  // Gradient Base
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#3b1461');
  gradient.addColorStop(0.5, '#2a0e45');
  gradient.addColorStop(1, '#1a0525');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Add some texture lines (abstract shards)
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for(let i=0; i<5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * CARD_WIDTH, 0);
    ctx.lineTo(Math.random() * CARD_WIDTH, CARD_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Gold Border
  ctx.save();
  drawShieldPath(ctx, CARD_WIDTH, CARD_HEIGHT);
  ctx.lineWidth = 15;
  ctx.strokeStyle = '#ffd700'; // Gold
  ctx.stroke();
  
  // Inner thin border
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff8dc'; // Cornsilk
  ctx.stroke();
  ctx.restore();

  // 4. Player Image (Center/Right)
  // We place the player before the sidebar info so the sidebar text overlays correctly if needed,
  // but usually player is behind text.
  const playerScale = 1.1;
  const playerW = 400 * playerScale;
  const playerH = 400 * playerScale;
  // Center horizontally, slightly up
  const playerX = (CARD_WIDTH - playerW) / 2 + 50; 
  const playerY = 180;
  
  ctx.drawImage(playerImg, playerX, playerY, playerW, playerH);

  // Fade player bottom to blend with text area
  const fadeGradient = ctx.createLinearGradient(0, playerY + playerH - 100, 0, playerY + playerH);
  fadeGradient.addColorStop(0, 'rgba(42, 14, 69, 0)');
  fadeGradient.addColorStop(1, 'rgba(42, 14, 69, 1)');
  ctx.fillStyle = fadeGradient;
  ctx.fillRect(0, playerY + playerH - 100, CARD_WIDTH, 120);

  // 5. Sidebar Info (Left Side)
  const leftMargin = 60;
  let cursorY = 160;

  // Form Number (Rating)
  ctx.font = '700 110px "Oswald"';
  ctx.fillStyle = '#ffd700'; // Gold Text
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(player.formNumber.toString().padStart(2, '0'), leftMargin + 20, cursorY);
  
  cursorY += 40;
  
  // Position (Role Abbr) - Just first 3 letters for style
  const roleAbbr = player.role.substring(0, 3).toUpperCase();
  ctx.font = '600 40px "Bebas Neue"';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(roleAbbr, leftMargin + 20, cursorY);

  cursorY += 30;

  // Divider Line
  ctx.beginPath();
  ctx.moveTo(leftMargin - 20, cursorY);
  ctx.lineTo(leftMargin + 60, cursorY);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  cursorY += 40;

  // Agrasen Portrait (Circular)
  const iconSize = 70;
  ctx.save();
  ctx.beginPath();
  ctx.arc(leftMargin + 20, cursorY + iconSize/2, iconSize/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(agrasenImg, leftMargin + 20 - iconSize/2, cursorY, iconSize, iconSize);
  ctx.restore();
  // Icon Border
  ctx.beginPath();
  ctx.arc(leftMargin + 20, cursorY + iconSize/2, iconSize/2, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd700';
  ctx.stroke();

  cursorY += iconSize + 20;

  // Tournament Logo
  ctx.drawImage(logoImg, leftMargin + 20 - iconSize/2, cursorY, iconSize, iconSize);

  // 6. Player Name (Bottom Center)
  const nameY = 580;
  ctx.save();
  ctx.font = '400 80px "Bebas Neue"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  
  // Gold underline/box for name
  // ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  // ctx.fillRect(40, nameY - 70, CARD_WIDTH - 80, 90);
  
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  ctx.fillText(player.name.toUpperCase(), CARD_WIDTH / 2, nameY);
  ctx.restore();

  // 7. Stats Stack (Bottom Area)
  const statsStartY = 640;
  const statsLineHeight = 50;
  
  ctx.font = '600 32px "Montserrat"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0e0e0';

  // Helper to draw stat line: Label .... Value
  const drawStat = (label: string, value: string, y: number) => {
    // Divider
    ctx.beginPath();
    ctx.moveTo(CARD_WIDTH * 0.2, y - 35);
    ctx.lineTo(CARD_WIDTH * 0.8, y - 35);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.font = '400 28px "Bebas Neue"';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(label, CARD_WIDTH / 2, y - 5);
    
    ctx.font = '600 32px "Montserrat"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value.toUpperCase(), CARD_WIDTH / 2, y + 30);
  };

  drawStat("ROLE", player.role, statsStartY);
  drawStat("BATTING", player.battingStyle, statsStartY + 90);
  drawStat("BOWLING", player.bowlingStyle, statsStartY + 180);

  return canvas.toDataURL('image/png');
};