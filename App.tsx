
import React, { useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { PlayerData, CardAssets, GeneratedCard, ProcessStatus } from './types';
import { parseExcelFile, downloadTemplate } from './services/excelService';
import { generateCard } from './services/cardGenerator';
import { getScoutReport } from './services/geminiService';
import { Loader2, Download, Bot, AlertTriangle, Image as ImageIcon, User, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const App: React.FC = () => {
  const [assets, setAssets] = useState<CardAssets>({ 
    excelFile: null, 
    agrasenImage: null, 
    logoImage: null,
    localImageMap: {} 
  });
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // Helper to get the final image URL for a player (checking manual, batch, then Excel)
  const getPlayerImageSource = (player: PlayerData): string | null => {
    if (player.manualImage) return player.manualImage;
    
    // Check batch map
    const excelValue = player.imageUrl.trim();
    if (assets.localImageMap[excelValue]) {
      return assets.localImageMap[excelValue];
    }
    // Check batch map without extension
    const nameNoExt = excelValue.split('.')[0];
    if (assets.localImageMap[nameNoExt]) {
      return assets.localImageMap[nameNoExt];
    }
    
    // Check if it looks like a real URL
    if (player.imageUrl.startsWith('http') || player.imageUrl.startsWith('data:')) {
      return player.imageUrl;
    }

    return null;
  };

  const handleParseData = async () => {
    if (!assets.excelFile) return;
    
    try {
      setStatus(ProcessStatus.PARSING);
      setErrorMessage(null);
      const parsedPlayers = await parseExcelFile(assets.excelFile);
      setPlayers(parsedPlayers);
      setStatus(ProcessStatus.REVIEW);
    } catch (error) {
      console.error(error);
      setStatus(ProcessStatus.ERROR);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error during parsing.");
    }
  };

  const handleForgeCards = async () => {
    if (!assets.agrasenImage || !assets.logoImage) {
      setErrorMessage("Please upload the Agrasen Portrait and Tournament Logo before generating.");
      return;
    }

    try {
      setStatus(ProcessStatus.GENERATING);
      const cards: GeneratedCard[] = [];
      
      for (const player of players) {
        const finalSource = getPlayerImageSource(player) || ''; // Empty string triggers placeholder
        
        const dataUrl = await generateCard(
          { ...player, imageUrl: finalSource }, 
          assets.agrasenImage, 
          assets.logoImage
        );
        
        cards.push({ playerId: player.id, dataUrl });
        setGeneratedCards([...cards]);
      }

      setStatus(ProcessStatus.COMPLETED);
      if (cards.length > 0) setSelectedCard(cards[0]);

    } catch (error) {
      console.error(error);
      setStatus(ProcessStatus.ERROR);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred during processing.");
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    generatedCards.forEach(card => {
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
    const updatedSelected = updatedCards.find(c => c.playerId === selectedCard.playerId);
    if (updatedSelected) setSelectedCard(updatedSelected);
    setScouting(false);
  };

  const handleBatchImageUpload = (files: File[]) => {
    const newMap: Record<string, string> = { ...assets.localImageMap };
    files.forEach(file => {
      const objectUrl = URL.createObjectURL(file);
      newMap[file.name] = objectUrl;
      const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
      if (nameWithoutExt) newMap[nameWithoutExt] = objectUrl;
    });
    setAssets(prev => ({ ...prev, localImageMap: newMap }));
  };

  const handleIndividualUpload = (playerId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, manualImage: objectUrl } : p
    ));
  };

  return (
    <div className="min-h-screen bg-[#0f0518] text-gray-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-96 bg-[#1a0525] border-r border-purple-900/30 p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-2xl h-screen sticky top-0">
        <header>
          <h1 className="text-3xl font-bebas text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-400 tracking-wider">
            Player Card Forge
          </h1>
          <p className="text-sm text-purple-300/60 mt-1">ACL-5 Tournament Edition</p>
        </header>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {status === ProcessStatus.REVIEW ? 'Step 2: Assign Assets' : 'Step 1: Configuration'}
            </h2>
            <button 
              onClick={downloadTemplate} 
              className="text-xs text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
            >
              <Download size={12} /> Template
            </button>
          </div>
          
          <Dropzone 
            label="1. Upload Excel Data" 
            accept=".xlsx,.xls"
            iconType="excel"
            currentFile={assets.excelFile}
            onFileSelect={(f) => {
              setAssets(prev => ({ ...prev, excelFile: f }));
              setStatus(ProcessStatus.IDLE); // Reset if file changes
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <Dropzone 
              label="2. Agrasen Portrait" 
              accept="image/*"
              iconType="image"
              currentFile={assets.agrasenImage}
              onFileSelect={async (f) => {
                const url = await fileToDataUrl(f);
                setAssets(prev => ({ ...prev, agrasenImage: url }));
              }}
            />
            <Dropzone 
              label="3. Event Logo" 
              accept="image/*"
              iconType="image"
              currentFile={assets.logoImage}
              onFileSelect={async (f) => {
                const url = await fileToDataUrl(f);
                setAssets(prev => ({ ...prev, logoImage: url }));
              }}
            />
          </div>

          <div className="border-t border-purple-900/50 pt-4 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Bulk Assets (Optional)</h3>
            <Dropzone 
              label="Batch Player Photos" 
              accept="image/*"
              iconType="folder"
              multiple={true}
              fileCount={Object.keys(assets.localImageMap).length / 2}
              currentFile={null}
              onFilesSelect={handleBatchImageUpload}
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Drag multiple photos here to auto-match filenames in Excel.
            </p>
          </div>
        </div>

        {/* Action Button Changes based on Status */}
        <div className="mt-2">
          {status === ProcessStatus.IDLE || status === ProcessStatus.PARSING || status === ProcessStatus.ERROR ? (
             <button
             onClick={handleParseData}
             disabled={!assets.excelFile || status === ProcessStatus.PARSING}
             className={`
               w-full py-4 rounded-lg font-bold text-lg tracking-wide uppercase transition-all duration-300
               flex items-center justify-center gap-2
               ${status === ProcessStatus.PARSING || !assets.excelFile
                 ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
                 : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50'}
             `}
           >
             {status === ProcessStatus.PARSING ? <><Loader2 className="animate-spin" /> Parsing...</> : 'Step 1: Parse Data'}
           </button>
          ) : (
            <button
            onClick={handleForgeCards}
            disabled={status === ProcessStatus.GENERATING}
            className={`
              w-full py-4 rounded-lg font-bold text-lg tracking-wide uppercase transition-all duration-300
              flex items-center justify-center gap-2
              ${status === ProcessStatus.GENERATING 
                ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-orange-900/50'}
            `}
          >
            {status === ProcessStatus.GENERATING ? <><Loader2 className="animate-spin" /> Forging...</> : 'Step 2: Forge Cards'}
          </button>
          )}
        </div>

        {status === ProcessStatus.COMPLETED && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center animate-fade-in">
            <p className="text-green-400 font-semibold mb-3">
              {generatedCards.length} Cards Forged
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
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col gap-2 text-red-400 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-center gap-3 font-semibold">
                <AlertTriangle />
                <p>Error</p>
             </div>
             {errorMessage && (
                <p className="text-sm ml-9 opacity-80 border-l-2 border-red-500/50 pl-2">
                  {errorMessage}
                </p>
             )}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0f0518] to-[#0f0518] pointer-events-none" />

        <div className="flex-1 p-8 overflow-y-auto z-0">
          
          {/* Default Empty State */}
          {status === ProcessStatus.IDLE && (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
              <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                <ImageIcon className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-xl font-light">Upload an Excel file to begin building the roster.</p>
            </div>
          )}

          {/* Phase 2: Roster Editor / Review */}
          {status === ProcessStatus.REVIEW && (
             <div className="max-w-5xl mx-auto pb-20">
               <div className="flex justify-between items-end mb-6 sticky top-0 bg-[#0f0518]/95 backdrop-blur-sm z-20 py-4 border-b border-gray-800">
                  <div>
                    <h2 className="text-2xl font-bebas text-white tracking-wide">Player Roster</h2>
                    <p className="text-gray-400 text-sm">
                      Review players and attach photos before generating cards. 
                      <span className="text-purple-400 ml-1">
                        {players.filter(p => getPlayerImageSource(p)).length}/{players.length} Ready
                      </span>
                    </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => {
                    const imgSrc = getPlayerImageSource(player);
                    const hasImage = !!imgSrc;
                    return (
                      <div key={player.id} className={`
                        flex items-center gap-4 p-3 rounded-lg border transition-all
                        ${hasImage ? 'bg-purple-900/20 border-purple-500/30' : 'bg-gray-900 border-gray-700'}
                      `}>
                         <div className="relative group w-16 h-16 shrink-0">
                            {hasImage ? (
                              <img src={imgSrc} alt="" className="w-16 h-16 object-cover rounded-md border border-purple-500/50" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700">
                                <User className="text-gray-600" size={24} />
                              </div>
                            )}
                            
                            {/* Individual Upload Overlay */}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer rounded-md transition-opacity">
                               <UploadCloud className="text-white" size={20} />
                               <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden"
                                  onChange={(e) => {
                                    if(e.target.files?.[0]) handleIndividualUpload(player.id, e.target.files[0]);
                                  }}
                               />
                            </label>
                         </div>

                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-200 truncate">{player.name}</h4>
                            <p className="text-xs text-gray-500">{player.role} • OVR {player.formNumber}</p>
                            {!hasImage && (
                              <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1">
                                <AlertCircle size={10} /> Missing Photo
                              </p>
                            )}
                         </div>

                         {hasImage && <CheckCircle2 className="text-green-500 shrink-0" size={20} />}
                      </div>
                    );
                  })}
               </div>
             </div>
          )}

          {/* Phase 3: Results (Gallery) */}
          {(status === ProcessStatus.GENERATING || status === ProcessStatus.COMPLETED) && (
            <div className="flex flex-col md:flex-row gap-8 items-start justify-center h-full">
              {generatedCards.length > 0 && (
                <>
                  {/* Selected Card View */}
                  <div className="flex flex-col items-center gap-6 sticky top-0">
                    <div className="relative group">
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
                      Completed Cards ({generatedCards.length})
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
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
