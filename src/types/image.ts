// types/image.ts

export type AspectRatio = "16:9" | "1:1" | "4:3";

export interface ImageIntent {
  alt: string;
  query: string;
  aspectRatio?: AspectRatio;
  visualStyle?: string;
}

export interface ResolvedImage {
  id: string;
  alt: string;
  imageUrl: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
  width: number;
  height: number;
}