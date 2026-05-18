import type { Chapter } from '../types/novel';

const htmlTagPattern = /<[^>]*>/g;
const cjkCharacterPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

let wordSegmenter: Intl.Segmenter | null | undefined;

function getWordSegmenter(): Intl.Segmenter | null {
  if (wordSegmenter !== undefined) {
    return wordSegmenter;
  }

  try {
    wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  } catch {
    wordSegmenter = null;
  }

  return wordSegmenter;
}

function countWordsWithSegmenter(text: string): number {
  const segmenter = getWordSegmenter();

  if (!segmenter) {
    return 0;
  }

  let count = 0;
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike) {
      count += 1;
    }
  }

  return count;
}

function countWordsWithFallback(text: string): number {
  const tokens = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\p{Script=Hangul}\p{Letter}\p{Number}]+/gu);

  if (!tokens) {
    return 0;
  }

  return tokens.reduce((count, token) => {
    if (cjkCharacterPattern.test(token)) {
      return count + Array.from(token).length;
    }

    return count + 1;
  }, 0);
}

export function countWords(html: string): number {
  const text = html.replace(htmlTagPattern, ' ');
  const trimmed = text.trim();
  if (trimmed === '') return 0;

  const segmentedCount = countWordsWithSegmenter(trimmed);
  if (segmentedCount > 0) {
    return segmentedCount;
  }

  return countWordsWithFallback(trimmed);
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
  let chaptersProcessed = 0;
  
  for (let i = 0; i < chapters.length; i++) {
    const chapterWords = countWords(chapters[i].body);
    if (wordCount + chapterWords > targetWords && wordCount > 0) {
      break;
    }
    wordCount += chapterWords;
    chaptersProcessed = i + 1;
  }
  
  const endChapter = startChapter + chaptersProcessed - 1;
  
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
