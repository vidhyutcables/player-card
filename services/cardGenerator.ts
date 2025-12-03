import { PlayerData } from '../types';

// Dimensions for a high-quality card output
const CARD_WIDTH = 600;
const CARD_HEIGHT = 850;

/**
 * Loads an image from a URL or Data URI
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    if (!src) {
        console.warn("No source URL provided for image, using placeholder.");
        resolve(createPlaceholder());
        return;
    }

    const img = new Image();
    // Helper to handle CORS. 
    // Note: If the server doesn't support CORS, canvas export will fail (tainted canvas).
    // In that case, we catch the error and return a placeholder to allow the rest of the batch to proceed.
    img.crossOrigin = "anonymous"; 
    
    img.onload = () => resolve(img);
    
    img.onerror = (e) => {
      console.warn(`Failed to load image: ${src}. \nPossible reasons: \n1. CORS not allowed by server. \n2. Invalid URL. \n3. 403 Forbidden (Google Drive file not public).`, e);
      // Fallback: Return placeholder so the app doesn't crash
      resolve(createPlaceholder());
    };
    
    img.src = src;
  });
};

/**
 * Creates a fallback image programmatically to ensure the app works offline
 */
const createPlaceholder = (): HTMLImageElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (ctx) {
        ctx.fillStyle = '#2a0e45';
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#4a1d6e';
        ctx.fillRect(20, 20, 360, 360);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NO IMAGE', 200, 200);
    }
    
    img.src = canvas.toDataURL();
    return img;
};

/**
 * Draws text that scales down to fit a maximum width
 */
const drawTextWithFit = (
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  initialFontSize: number, 
  fontFace: string,
  fontWeight: string = '600',
  color: string = '#ffffff'
) => {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic'; // Reset baseline to standard
    ctx.fillStyle = color;
    
    let fontSize = initialFontSize;
    ctx.font = `${fontWeight} ${fontSize}px "${fontFace}"`;
    
    // Reduce font size until it fits, stepping down faster for efficiency
    while (ctx.measureText(text).width > maxWidth && fontSize > 14) {
        fontSize -= 2; 
        ctx.font = `${fontWeight} ${fontSize}px "${fontFace}"`;
    }
    
    ctx.fillText(text, x, y);
    ctx.restore();
    return fontSize;
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

  // START CLIPPING SCOPE
  ctx.save();

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

  // 3. Player Image (Center/Right)
  // We place the player before the sidebar info so the sidebar text overlays correctly if needed.
  const playerScale = 1.1;
  const playerW = 400 * playerScale;
  const playerH = 400 * playerScale;
  // Center horizontally, shifted slightly right
  const playerX = (CARD_WIDTH - playerW) / 2 + 50; 
  // Moved up to 135 to avoid being too low, better head positioning
  const playerY = 135; 
  
  ctx.drawImage(playerImg, playerX, playerY, playerW, playerH);

  // Fade player bottom to blend with text area
  const fadeGradient = ctx.createLinearGradient(0, playerY + playerH - 120, 0, playerY + playerH);
  fadeGradient.addColorStop(0, 'rgba(42, 14, 69, 0)');
  fadeGradient.addColorStop(1, 'rgba(42, 14, 69, 1)');
  ctx.fillStyle = fadeGradient;
  ctx.fillRect(0, playerY + playerH - 120, CARD_WIDTH, 140);

  // 4. Sidebar Info (Left Side)
  // Shifted right to prevent cropping on left edge
  const leftColumnCenter = 115; 
  let cursorY = 160;

  // Form Number (Rating)
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  // Font size 80
  drawTextWithFit(ctx, player.formNumber.toString().padStart(2, '0'), leftColumnCenter, cursorY, 100, 80, 'Oswald', '700', '#ffd700');
  
  cursorY += 40;
  
  // Position (Role Abbr) - Just first 3 letters for style
  const roleAbbr = player.role.substring(0, 3).toUpperCase();
  ctx.font = '600 40px "Bebas Neue"';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; 
  ctx.fillText(roleAbbr, leftColumnCenter, cursorY);

  cursorY += 30;

  // Divider Line
  ctx.beginPath();
  ctx.moveTo(leftColumnCenter - 30, cursorY);
  ctx.lineTo(leftColumnCenter + 30, cursorY);
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
  ctx.arc(leftColumnCenter, cursorY + iconSize/2, iconSize/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(agrasenImg, leftColumnCenter - iconSize/2, cursorY, iconSize, iconSize);
  ctx.restore();
  // Icon Border
  ctx.beginPath();
  ctx.arc(leftColumnCenter, cursorY + iconSize/2, iconSize/2, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd700';
  ctx.stroke();

  cursorY += iconSize + 20;

  // Tournament Logo
  // Centered in column
  ctx.drawImage(logoImg, leftColumnCenter - iconSize/2, cursorY, iconSize, iconSize);

  // 5. Player Name (Bottom Center)
  const nameY = 530; 
  ctx.save();
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  
  // Auto-fit name if it's too long
  drawTextWithFit(ctx, player.name.toUpperCase(), CARD_WIDTH / 2, nameY, CARD_WIDTH - 120, 60, 'Bebas Neue', '400', '#ffd700');
  ctx.restore();

  // 6. Stats Stack (Bottom Area)
  const statsStartY = 590;
  const statsGap = 58; 
  
  // Helper to draw stat line: Label .... Value
  const drawStat = (label: string, value: string, y: number) => {
    // Divider
    ctx.beginPath();
    ctx.moveTo(CARD_WIDTH * 0.2, y - 30);
    ctx.lineTo(CARD_WIDTH * 0.8, y - 30);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Label
    ctx.textAlign = 'center';
    ctx.font = '400 20px "Bebas Neue"';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(label, CARD_WIDTH / 2, y - 5);
    
    // Value - Fit text if too long
    drawTextWithFit(ctx, value.toUpperCase(), CARD_WIDTH / 2, y + 25, CARD_WIDTH - 160, 24, 'Montserrat', '600', '#ffffff');
  };

  drawStat("ROLE", player.role, statsStartY);
  drawStat("BATTING", player.battingStyle, statsStartY + statsGap);
  drawStat("BOWLING", player.bowlingStyle, statsStartY + (statsGap * 2));

  // END CLIPPING SCOPE
  ctx.restore();

  // 7. Gold Border (Overlay)
  // Drawn LAST to ensure it covers any image spill-over and looks clean
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

  return canvas.toDataURL('image/png');
};
