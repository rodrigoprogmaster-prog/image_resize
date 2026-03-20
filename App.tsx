import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
  Upload, 
  Download, 
  Maximize2, 
  Settings2, 
  Image as ImageIcon, 
  Zap, 
  Check, 
  RefreshCw,
  Instagram,
  Monitor,
  Smartphone,
  Layers,
  Info,
  Files,
  Trash2,
  FileArchive
} from 'lucide-react';
import { ImageData, ResizeOptions, ImageFormat, ImagePreset } from './types.ts';
import { getImageDimensions, resizeImage } from './utils/imageProcessor.ts';

const PRESETS: ImagePreset[] = [
  { label: "Instagram Square", width: 1080, height: 1080, icon: "Instagram" },
  { label: "Instagram Story", width: 1080, height: 1920, icon: "Smartphone" },
  { label: "4K Ultra HD", width: 3840, height: 2160, icon: "Monitor" },
  { label: "Full HD (1080p)", width: 1920, height: 1080, icon: "Monitor" },
];

interface ResizedImageData {
  url: string;
  size: number;
  name: string;
  blob: Blob;
}

const App: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [options, setOptions] = useState<ResizeOptions>({
    width: 0,
    height: 0,
    maintainAspectRatio: true,
    format: 'image/png',
    quality: 1.0
  });
  const [resizedImages, setResizedImages] = useState<ResizedImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const newImages: ImageData[] = [];
    
    for (const file of Array.from(files)) {
      if (file && file.type.startsWith('image/')) {
        try {
          const dimensions = await getImageDimensions(file);
          newImages.push({
            file,
            previewUrl: URL.createObjectURL(file),
            originalWidth: dimensions.width,
            originalHeight: dimensions.height
          });
        } catch (err) {
          console.error("Erro ao carregar imagem:", err);
        }
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      // If it's the first batch, set options based on the first image
      if (images.length === 0) {
        setOptions(prev => ({
          ...prev,
          width: newImages[0].originalWidth,
          height: newImages[0].originalHeight
        }));
      }
      setResizedImages([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleWidthChange = (val: number) => {
    const currentImage = images[selectedImageIndex];
    if (options.maintainAspectRatio && currentImage) {
      const ratio = currentImage.originalHeight / currentImage.originalWidth;
      setOptions(prev => ({ ...prev, width: val, height: Math.round(val * ratio) }));
    } else {
      setOptions(prev => ({ ...prev, width: val }));
    }
  };

  const handleHeightChange = (val: number) => {
    const currentImage = images[selectedImageIndex];
    if (options.maintainAspectRatio && currentImage) {
      const ratio = currentImage.originalWidth / currentImage.originalHeight;
      setOptions(prev => ({ ...prev, height: val, width: Math.round(val * ratio) }));
    } else {
      setOptions(prev => ({ ...prev, height: val }));
    }
  };

  const applyScale = (factor: number) => {
    const currentImage = images[selectedImageIndex];
    if (!currentImage) return;
    setOptions(prev => ({
      ...prev,
      width: Math.round(currentImage.originalWidth * factor),
      height: Math.round(currentImage.originalHeight * factor),
      maintainAspectRatio: true
    }));
  };

  const processImages = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const results: ResizedImageData[] = [];
      for (const img of images) {
        const { blob, url } = await resizeImage(img.file, options);
        results.push({
          url,
          blob,
          size: blob.size,
          name: img.file.name
        });
      }
      setResizedImages(results);
    } catch (err) {
      console.error(err);
      alert("Erro ao processar imagens.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPreset = (preset: { width: number; height: number }) => {
    setOptions(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height,
      maintainAspectRatio: false
    }));
  };

  const downloadSingle = (index: number) => {
    const resized = resizedImages[index];
    if (!resized) return;
    const link = document.createElement('a');
    link.href = resized.url;
    const ext = options.format.split('/')[1];
    const baseName = resized.name.substring(0, resized.name.lastIndexOf('.')) || resized.name;
    link.download = `${baseName}-${options.width}x${options.height}.${ext}`;
    link.click();
  };

  const downloadZip = async () => {
    if (resizedImages.length === 0) return;
    const zip = new JSZip();
    const ext = options.format.split('/')[1];

    resizedImages.forEach((img, idx) => {
      const baseName = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
      zip.file(`${baseName}-${options.width}x${options.height}.${ext}`, img.blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixelperfect-batch-${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].previewUrl);
    newImages.splice(index, 1);
    setImages(newImages);
    setResizedImages([]);
    if (selectedImageIndex >= newImages.length) {
      setSelectedImageIndex(Math.max(0, newImages.length - 1));
    }
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setResizedImages([]);
    setSelectedImageIndex(0);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Instagram': return <Instagram size={16} />;
      case 'Smartphone': return <Smartphone size={16} />;
      case 'Monitor': return <Monitor size={16} />;
      default: return <Maximize2 size={16} />;
    }
  };

  const currentImage = images[selectedImageIndex];
  const currentResized = resizedImages[selectedImageIndex];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/40">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">PixelPerfect <span className="text-cyan-500 font-medium italic">Pro</span></h1>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Processamento em Lote Ativo
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <button className="text-slate-400 hover:text-white transition-colors">
            <Info size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-full lg:w-80 border-r border-slate-800 bg-slate-900/30 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            {/* Upload Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Files size={12} /> Arquivos ({images.length})
                </h2>
                {images.length > 0 && (
                  <button onClick={clearAll} className="text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider">
                    Limpar Tudo
                  </button>
                )}
              </div>
              
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative group border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-300
                  ${dragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                  multiple
                />
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-cyan-600 transition-colors">
                    <Upload size={14} className="text-slate-400 group-hover:text-white" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400">
                    Adicionar Imagens
                  </p>
                </div>
              </div>

              {/* Image List */}
              {images.length > 0 && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {images.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`
                        group flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all
                        ${selectedImageIndex === idx ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}
                      `}
                    >
                      <img src={img.previewUrl} className="w-8 h-8 rounded-md object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate text-slate-300">{img.file.name}</p>
                        <p className="text-[9px] text-slate-500">{img.originalWidth}×{img.originalHeight}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Dimensions Section */}
            <AnimatePresence>
              {images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-8"
                >
                  <section>
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Maximize2 size={12} /> Resolução (Lote)
                    </h2>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[1, 2, 4].map((f) => (
                        <button 
                          key={f}
                          onClick={() => applyScale(f)}
                          className={`
                            py-2 rounded-xl text-xs font-bold transition-all border
                            ${currentImage && (options.width === Math.round(currentImage.originalWidth * f)) 
                              ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/40' 
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}
                          `}
                        >
                          {f}X
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">Largura</label>
                        <input 
                          type="number"
                          value={options.width}
                          onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                          className="input-field w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">Altura</label>
                        <input 
                          type="number"
                          value={options.height}
                          onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                          className="input-field w-full"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setOptions(prev => ({ ...prev, maintainAspectRatio: !prev.maintainAspectRatio }))}
                      className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${options.maintainAspectRatio ? 'bg-cyan-600 border-cyan-500' : 'border-slate-700'}`}>
                        {options.maintainAspectRatio && <Check size={8} className="text-white" />}
                      </div>
                      Manter Proporção
                    </button>
                  </section>

                  <section>
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Settings2 size={12} /> Configurações de Exportação
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold text-slate-600 uppercase">Qualidade</label>
                          <span className="text-[10px] font-mono text-cyan-500">{Math.round(options.quality * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0.1" max="1.0" step="0.01"
                          value={options.quality}
                          onChange={(e) => setOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">Formato</label>
                        <select 
                          value={options.format}
                          onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as ImageFormat }))}
                          className="input-field w-full text-xs font-medium"
                        >
                          <option value="image/png">PNG (Sem perda)</option>
                          <option value="image/jpeg">JPEG (Comprimido)</option>
                          <option value="image/webp">WEBP (Otimizado)</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <button 
                    onClick={processImages}
                    disabled={isProcessing || images.length === 0}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                  >
                    {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
                    PROCESSAR {images.length} IMAGENS
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 bg-slate-950 p-6 lg:p-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          {/* Preview Window */}
          <div className="flex-1 min-h-[400px] glass-panel p-2 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                {currentResized ? 'Renderização Final' : 'Preview Original'}
              </div>
              {currentImage && (
                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-[9px] font-bold tracking-widest text-cyan-500 uppercase">
                  {options.width} × {options.height}
                </div>
              )}
            </div>

            <div className="flex-1 rounded-2xl bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950 flex items-center justify-center overflow-auto p-8 custom-scrollbar">
              <AnimatePresence mode="wait">
                {!currentImage ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center max-w-xs"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center mb-6 border border-slate-800">
                      <ImageIcon size={32} className="text-slate-700" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Nenhuma imagem selecionada</h3>
                    <p className="text-sm text-slate-500">Faça o upload de imagens para iniciar o redimensionamento em lote de alta performance.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`${selectedImageIndex}-${currentResized ? 'resized' : 'original'}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                  >
                    <img 
                      src={currentResized ? currentResized.url : currentImage.previewUrl} 
                      className="max-w-full max-h-[60vh] rounded-lg shadow-2xl border border-white/5"
                      alt="Preview" 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Download Overlay */}
            <AnimatePresence>
              {resizedImages.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 pl-6 bg-slate-900/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Total Processado</span>
                    <span className="text-xs font-mono font-bold text-white">{resizedImages.length} Arquivos</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800 mx-2" />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadSingle(selectedImageIndex)}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <Download size={14} /> Atual
                    </button>
                    <button 
                      onClick={downloadZip}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <FileArchive size={14} /> Baixar Tudo (ZIP)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Presets Grid */}
          <section>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Monitor size={12} /> Presets Rápidos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(p)}
                  className="group glass-panel p-4 text-left hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-slate-500 group-hover:text-cyan-500 transition-colors">
                      {getIcon(p.icon)}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-wider">{p.label}</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-400 group-hover:text-white">
                    {p.width}<span className="text-slate-700 mx-1">×</span>{p.height}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-slate-900 bg-slate-950 flex items-center justify-center px-6">
        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.4em]">
          PixelPerfect Engine • Processamento em Lote • 100% Local • ZIP Export
        </p>
      </footer>
    </div>
  );
};

export default App;

