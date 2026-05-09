export interface NovelMetadata {
  slug: string;
  title: string;
  description: string;
  author: string;
  coverImage: string;
  totalChapters: number;
  publishDate: string;
  language: string;
  volumes: VolumeInfo[];
}

export interface VolumeInfo {
  id: number;
  file: string;
  chapterRange: [number, number];
}

export interface VolumeData {
  bundleId: number;
  range: string;
  novelSlug: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: number;
  title: string;
  volume: number;
  volumeTitle: string;
  body: string;
  url?: string;
}

export interface NovelProgress {
  slug: string;
  lastChapter: number;
  lastUpdated: number;
}

export interface ReaderPreferences {
  darkMode: boolean;
  fontSize: number;
  lineHeight: 'compact' | 'normal' | 'relaxed';
  readingWidth: 'narrow' | 'medium' | 'wide';
  batchMode: 'chapters' | 'words';
  batchSize: number;
}

export interface BatchResult {
  start: number;
  end: number;
  chapters: Chapter[];
  wordCount?: number;
}
