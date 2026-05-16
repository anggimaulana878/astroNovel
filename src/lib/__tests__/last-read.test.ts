import { describe, expect, it } from 'vitest';

import {
  buildLastReadCardData,
  type LastReadNovelSeed,
  type StoredNovelProgress,
  type StoredReaderPreferences,
} from '../last-read';

const novelSeeds: LastReadNovelSeed[] = [
  {
    slug: 'super-gene',
    title: 'Super Gene',
    coverImage: '/novels/super-gene/cover.jpg',
    totalChapters: 4000,
  },
  {
    slug: 'shadow-slave',
    title: 'Shadow Slave',
    coverImage: '/novels/shadow-slave/cover.jpg',
    totalChapters: 2200,
  },
];

describe('last-read helper', () => {
  it('returns the newest valid progress entry matched to a known novel', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'super-gene', lastChapter: 120, lastUpdated: 1_000 },
      { slug: 'shadow-slave', lastChapter: 44, lastUpdated: 2_000 },
    ];

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences: null,
    });

    expect(result).toMatchObject({
      slug: 'shadow-slave',
      title: 'Shadow Slave',
      coverImage: '/novels/shadow-slave/cover.jpg',
      lastChapter: 44,
      batchMode: 'chapters',
      batchSize: 5,
      resumeUrl: '/novels/shadow-slave/read?start=44&mode=chapters&size=5',
    });
  });

  it('ignores malformed or unknown progress entries', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'missing-slug', lastChapter: 99, lastUpdated: 5_000 },
      { slug: 'super-gene', lastChapter: 0, lastUpdated: 6_000 },
      { slug: 'shadow-slave', lastChapter: 18.5, lastUpdated: 7_000 },
      { slug: 'super-gene', lastChapter: 33, lastUpdated: 8_000 },
    ];

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences: null,
    });

    expect(result?.slug).toBe('super-gene');
    expect(result?.lastChapter).toBe(33);
  });

  it('clamps lastChapter to the matched novel totalChapters', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'shadow-slave', lastChapter: 9_999, lastUpdated: 4_000 },
    ];

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences: null,
    });

    expect(result?.lastChapter).toBe(2200);
    expect(result?.resumeUrl).toBe('/novels/shadow-slave/read?start=2200&mode=chapters&size=5');
  });

  it('uses validated chapter preferences when they are within bounds', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'super-gene', lastChapter: 55, lastUpdated: 4_000 },
    ];
    const preferences: StoredReaderPreferences = {
      batchMode: 'chapters',
      batchSize: 9,
    };

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences,
    });

    expect(result?.batchMode).toBe('chapters');
    expect(result?.batchSize).toBe(9);
    expect(result?.resumeUrl).toBe('/novels/super-gene/read?start=55&mode=chapters&size=9');
  });

  it('falls back to default chapter preferences when invalid chapter preferences are provided', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'super-gene', lastChapter: 55, lastUpdated: 4_000 },
    ];
    const preferences: StoredReaderPreferences = {
      batchMode: 'chapters',
      batchSize: 99,
    };

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences,
    });

    expect(result?.batchMode).toBe('chapters');
    expect(result?.batchSize).toBe(5);
  });

  it('uses validated words preferences and preserves stored size directly', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'super-gene', lastChapter: 80, lastUpdated: 4_000 },
    ];
    const preferences: StoredReaderPreferences = {
      batchMode: 'words',
      batchSize: 5000,
    };

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences,
    });

    expect(result?.batchMode).toBe('words');
    expect(result?.batchSize).toBe(5000);
    expect(result?.resumeUrl).toBe('/novels/super-gene/read?start=80&mode=words&size=5000');
  });

  it('falls back to default words size when invalid words preferences are provided', () => {
    const progressEntries: StoredNovelProgress[] = [
      { slug: 'super-gene', lastChapter: 80, lastUpdated: 4_000 },
    ];
    const preferences: StoredReaderPreferences = {
      batchMode: 'words',
      batchSize: 99,
    };

    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries,
      preferences,
    });

    expect(result?.batchMode).toBe('words');
    expect(result?.batchSize).toBe(5000);
  });

  it('returns null when no valid progress is available', () => {
    const result = buildLastReadCardData({
      novelSeeds,
      progressEntries: [],
      preferences: null,
    });

    expect(result).toBeNull();
  });
});
