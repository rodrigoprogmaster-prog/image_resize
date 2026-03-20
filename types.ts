
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  format: ImageFormat;
  quality: number;
}

export interface ImageData {
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
}

export interface ImagePreset {
  label: string;
  width: number;
  height: number;
  icon: string;
}
