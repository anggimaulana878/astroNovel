import type { Chapter } from '../types/novel';

export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  return text.trim().split(/\s+/).length;
}

export function getChapterBatch(
  startChapter: number,
  size: number,
  totalChapters: number
): { start: number; end: number } {
  const endChapter = Math.min(startChapter + size - 1, totalChapters);
  return { start: startChapter, end: endChapter };
}

export function getWordCountBatch(
  startChapter: number,
  targetWords: number,
  chapters: Chapter[]
): { start: number; end: number; wordCount: number } {
  let wordCount = 0;
  let endChapter = startChapter;
  
  for (let i = startChapter - 1; i < chapters.length; i++) {
    const chapterWords = countWords(chapters[i].body);
    if (wordCount + chapterWords > targetWords && wordCount > 0) {
      break;
    }
    wordCount += chapterWords;
    endChapter = i + 1;
  }
  
  return { start: startChapter, end: endChapter, wordCount };
}

export function validateBatchParams(mode: string, size: number): boolean {
  if (mode === 'chapters') {
    return size >= 1 && size <= 12;
  }
  if (mode === 'words') {
    return size >= 1000 && size <= 25000;
  }
  return false;
}

export function validateBatchForAssistant(chapters: Chapter[]): boolean {
  const totalWords = chapters.reduce((sum, ch) => sum + countWords(ch.body), 0);
  
  if (totalWords < 500) {
    console.warn(`Batch too short: ${totalWords} words. Google Assistant may not work.`);
    return false;
  }
  
  return true;
}
