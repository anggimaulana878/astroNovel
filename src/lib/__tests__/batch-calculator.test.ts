import { describe, it, expect } from 'vitest';
import { 
  countWords, 
  getChapterBatch, 
  getWordCountBatch,
  validateBatchParams,
  validateBatchForAssistant 
} from '../batch-calculator';
import type { Chapter } from '../../types/novel';

describe('batch-calculator', () => {
  describe('countWords', () => {
    it('should count words in plain text', () => {
      const html = '<p>Hello world test</p>';
      expect(countWords(html)).toBe(3);
    });

    it('should strip HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p><div>test</div>';
      expect(countWords(html)).toBe(3);
    });

    it('should handle empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('should handle multiple spaces', () => {
      const html = '<p>Hello    world</p>';
      expect(countWords(html)).toBe(2);
    });
  });

  describe('getChapterBatch', () => {
    it('should return correct batch within bounds', () => {
      const result = getChapterBatch(1, 5, 100);
      expect(result).toEqual({ start: 1, end: 5 });
    });

    it('should cap end at totalChapters', () => {
      const result = getChapterBatch(98, 5, 100);
      expect(result).toEqual({ start: 98, end: 100 });
    });

    it('should handle single chapter batch', () => {
      const result = getChapterBatch(50, 1, 100);
      expect(result).toEqual({ start: 50, end: 50 });
    });

    it('should handle max batch size (12)', () => {
      const result = getChapterBatch(1, 12, 100);
      expect(result).toEqual({ start: 1, end: 12 });
    });
  });

  describe('getWordCountBatch', () => {
    const mockChapters: Chapter[] = [
      { id: 1, title: 'Ch 1', volume: 1, volumeTitle: 'Vol 1', body: '<p>Hello world</p>' }, // 2 words
      { id: 2, title: 'Ch 2', volume: 1, volumeTitle: 'Vol 1', body: '<p>Test content here</p>' }, // 3 words
      { id: 3, title: 'Ch 3', volume: 1, volumeTitle: 'Vol 1', body: '<p>More test data</p>' }, // 3 words
      { id: 4, title: 'Ch 4', volume: 1, volumeTitle: 'Vol 1', body: '<p>Final chapter text</p>' }, // 3 words
    ];

    it('should return batch that fits target word count', () => {
      const result = getWordCountBatch(1, 5, mockChapters);
      expect(result.start).toBe(1);
      expect(result.end).toBe(2);
      expect(result.wordCount).toBe(5);
    });

    it('should include at least one chapter even if over target', () => {
      const result = getWordCountBatch(1, 1, mockChapters);
      expect(result.start).toBe(1);
      expect(result.end).toBe(1);
      expect(result.wordCount).toBe(2);
    });

    it('should handle reaching end of chapters', () => {
      const result = getWordCountBatch(1, 100, mockChapters);
      expect(result.start).toBe(1);
      expect(result.end).toBe(4);
      expect(result.wordCount).toBe(11);
    });
  });

  describe('validateBatchParams', () => {
    describe('chapters mode', () => {
      it('should accept valid chapter sizes (1-12)', () => {
        expect(validateBatchParams('chapters', 1)).toBe(true);
        expect(validateBatchParams('chapters', 5)).toBe(true);
        expect(validateBatchParams('chapters', 12)).toBe(true);
      });

      it('should reject invalid chapter sizes', () => {
        expect(validateBatchParams('chapters', 0)).toBe(false);
        expect(validateBatchParams('chapters', 13)).toBe(false);
        expect(validateBatchParams('chapters', -1)).toBe(false);
      });
    });

    describe('words mode', () => {
      it('should accept valid word counts (1000-25000)', () => {
        expect(validateBatchParams('words', 1000)).toBe(true);
        expect(validateBatchParams('words', 10000)).toBe(true);
        expect(validateBatchParams('words', 25000)).toBe(true);
      });

      it('should reject invalid word counts', () => {
        expect(validateBatchParams('words', 999)).toBe(false);
        expect(validateBatchParams('words', 25001)).toBe(false);
        expect(validateBatchParams('words', 0)).toBe(false);
      });
    });

    it('should reject invalid mode', () => {
      expect(validateBatchParams('invalid', 5)).toBe(false);
    });
  });

  describe('validateBatchForAssistant', () => {
    it('should accept batch with sufficient words (>500)', () => {
      const chapters: Chapter[] = [
        {
          id: 1,
          title: 'Chapter 1',
          volume: 1,
          volumeTitle: 'Volume 1',
          body: '<p>' + 'word '.repeat(600) + '</p>',
        },
      ];
      expect(validateBatchForAssistant(chapters)).toBe(true);
    });

    it('should reject batch with insufficient words (<500)', () => {
      const chapters: Chapter[] = [
        { 
          id: 1, 
          title: 'Ch 1', 
          volume: 1, 
          volumeTitle: 'Vol 1', 
          body: '<p>Short content</p>' 
        },
      ];
      expect(validateBatchForAssistant(chapters)).toBe(false);
    });

    it('should handle empty chapters array', () => {
      expect(validateBatchForAssistant([])).toBe(false);
    });
  });
});
