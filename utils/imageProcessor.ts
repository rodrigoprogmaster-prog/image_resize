
import { ResizeOptions } from '../types.ts';

/**
 * Redimensiona uma imagem usando a API Canvas.
 * Implementa interpolação de alta qualidade para upscaling e downscaling.
 */
export const resizeImage = (
  file: File,
  options: ResizeOptions
): Promise<{ blob: Blob; url: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;

        const ctx = canvas.getContext('2d', {
          alpha: true,
          desynchronized: true,
          willReadFrequently: false
        });

        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto do canvas'));
          return;
        }

        // Configurações críticas para manter a nitidez no aumento de resolução (Upscaling)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Em alguns navegadores, desenhar em um único passo com 'high' 
        // invoca algoritmos como Lanczos ou Bicúbico automaticamente.
        ctx.drawImage(img, 0, 0, options.width, options.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({ blob, url });
            } else {
              reject(new Error('Falha na conversão para Blob'));
            }
          },
          options.format,
          options.quality
        );
      };
      img.onerror = () => reject(new Error('Erro ao carregar a imagem'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
};

/**
 * Obtém as dimensões originais de um arquivo de imagem.
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Erro ao obter dimensões da imagem'));
    img.src = URL.createObjectURL(file);
  });
};
