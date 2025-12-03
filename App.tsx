import React, { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { PlayerData, CardAssets, GeneratedCard, ProcessStatus } from './types';
import { parseExcelFile } from './services/excelService';
import { generateCard } from './services/cardGenerator';
import { getScoutReport } from './services/geminiService';
import { Loader2, Download, Bot, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const App: React.FC = () => {
  const [assets, setAssets] = useState<CardAssets>({ excelFile: null, agrasenImage: null, logoImage: null });
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [selectedCard, setSelectedCard] = useState<GeneratedCard | null>(null);
  const [scouting, setScouting] = useState(false);

  // Helper to convert File to DataURL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleProcess = async () => {
    if (!assets.excelFile || !assets.agrasenImage || !assets.logoImage) return;

    try {
      setStatus(ProcessStatus.PARSING);
      // 1. Parse Excel
      const parsedPlayers = await parseExcelFile(assets.excelFile);
      setPlayers(parsedPlayers);

      setStatus(ProcessStatus.GENERATING);
      
      // 2. Generate Cards Sequentially (or batched) to avoid browser freeze
      const cards: GeneratedCard[] = [];
      
      for (const player of parsedPlayers) {
        const dataUrl = await generateCard(player, assets.agrasenImage, assets.logoImage);
        cards.push({ playerId: player.id, dataUrl });
        // Update state progressively for visual feedback
        setGeneratedCards([...cards]);
      }

      setStatus(ProcessStatus.COMPLETED);
      if (cards.length > 0) setSelectedCard(cards[0]);

    } catch (error) {
      console.error(error);
      setStatus(ProcessStatus.ERROR);
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    generatedCards.forEach(card => {
      // Remove data:image/png;base64, prefix
      const data = card.dataUrl.split(',')[1];
      const player = players.find(p => p.id === card.playerId);
      const filename = `${player?.name.replace(/[^a-z0-9]/gi, '_') || 'card'}.png`;
      zip.file(filename, data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'player_cards.zip');
  };

  const handleGenerateScoutReport = async () => {
    if (!selectedCard) return;
    const player = players.find(p => p.id === selectedCard.playerId);
    if (!player) return;

    setScouting(true);
    const report = await getScoutReport(player);
    
    const updatedCards = generatedCards.map(c => 
      c.playerId === selectedCard.playerId ? { ...c, scoutReport: report } : c
    );
    setGeneratedCards(updatedCards);
    // Update local selection to reflect change immediately
    const updatedSelected = updatedCards.find(c => c.playerId === selectedCard.playerId);
    if (updatedSelected) setSelectedCard(updatedSelected);
    
    setScouting(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0518] text-gray-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-96 bg-[#1a0525] border-r border-purple-900/30 p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-2xl">
        <header>
          <h1 className="text-3xl font-bebas text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-400 tracking-wider">
            Player Card Forge
          </h1>
          <p className="text-sm text-purple-300/60 mt-1">ACL-5 Tournament Edition</p>
        </header>

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Inputs</h2>
          
          <Dropzone 
            label="Upload Excel Data" 
            accept=".xlsx,.xls"
            iconType="excel"
            currentFile={assets.excelFile}
            onFileSelect={(f) => setAssets(prev => ({ ...prev, excelFile: f }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Dropzone 
              label="Agrasen Portrait" 
              accept="image/*"
              iconType="image"
              currentFile={assets.agrasenImage}
              onFileSelect={async (f) => {
                const url = await fileToDataUrl(f);
                setAssets(prev => ({ ...prev, agrasenImage: url }));
              }}
            />
            <Dropzone 
              label="Team/Event Logo" 
              accept="image/*"
              iconType="image"
              currentFile={assets.logoImage}
              onFileSelect={async (f) => {
                const url = await fileToDataUrl(f);
                setAssets(prev => ({ ...prev, logoImage: url }));
              }}
            />
          </div>
        </div>

        <button
          onClick={handleProcess}
          disabled={!assets.excelFile || !assets.agrasenImage || !assets.logoImage || status === ProcessStatus.GENERATING}
          className={`
            w-full py-4 rounded-lg font-bold text-lg tracking-wide uppercase transition-all duration-300
            flex items-center justify-center gap-2
            ${status === ProcessStatus.GENERATING 
              ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/50'}
          `}
        >
          {status === ProcessStatus.GENERATING ? (
            <><Loader2 className="animate-spin" /> Forge Active...</>
          ) : (
            'Generate Cards'
          )}
        </button>

        {status === ProcessStatus.COMPLETED && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center animate-fade-in">
            <p className="text-green-400 font-semibold mb-3">
              {generatedCards.length} Cards Forged Successfully
            </p>
            <button 
              onClick={handleDownloadZip}
              className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download ZIP
            </button>
          </div>
        )}

        {status === ProcessStatus.ERROR && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
             <AlertTriangle />
             <p>Error processing files. Please check formats.</p>
          </div>
        )}
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0f0518] to-[#0f0518] pointer-events-none" />

        <div className="flex-1 p-8 overflow-y-auto z-0 flex flex-col md:flex-row gap-8 items-start justify-center">
          
          {generatedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4 mt-20">
              <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                <ImageIcon className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-xl font-light">Ready to forge legends. Upload assets to begin.</p>
            </div>
          ) : (
            <>
              {/* Selected Card Large View */}
              <div className="flex flex-col items-center gap-6 sticky top-0">
                <div className="relative group">
                   {/* Glow effect behind card */}
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                   
                   {selectedCard && (
                     <img 
                       src={selectedCard.dataUrl} 
                       alt="Selected Card" 
                       className="relative w-full max-w-sm rounded-lg shadow-2xl transform transition-transform duration-500 hover:scale-[1.02]"
                     />
                   )}
                </div>
                
                {selectedCard && (
                  <div className="w-full max-w-sm bg-[#1a0525] border border-purple-500/30 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-amber-400 font-oswald tracking-wide uppercase text-sm">AI Scout Report</h3>
                      <button 
                         onClick={handleGenerateScoutReport}
                         disabled={scouting}
                         className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                         <Bot size={12} /> {scouting ? 'Analyzing...' : 'Analyze'}
                      </button>
                    </div>
                    <p className="text-gray-300 text-sm italic leading-relaxed min-h-[60px]">
                      {selectedCard.scoutReport 
                        ? `"${selectedCard.scoutReport}"` 
                        : "Click Analyze to generate an AI-powered bio for this player."}
                    </p>
                  </div>
                )}
              </div>

              {/* Grid Gallery */}
              <div className="flex-1 w-full">
                <h3 className="text-xl font-bebas text-gray-400 mb-4 sticky top-0 bg-[#0f0518]/90 backdrop-blur-sm p-2 z-10">
                  Roster ({generatedCards.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                  {generatedCards.map((card) => (
                    <button
                      key={card.playerId}
                      onClick={() => setSelectedCard(card)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200
                        ${selectedCard?.playerId === card.playerId 
                          ? 'border-amber-400 ring-2 ring-amber-400/20 scale-105 z-10' 
                          : 'border-transparent hover:border-purple-500/50 hover:scale-105 opacity-80 hover:opacity-100'}
                      `}
                    >
                      <img src={card.dataUrl} alt="Thumbnail" className="w-full h-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;