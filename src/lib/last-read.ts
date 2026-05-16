export interface LastReadNovelSeed {
  slug: string;
  title: string;
  coverImage: string;
  totalChapters: number;
}

export interface StoredNovelProgress {
  slug: string;
  lastChapter: number;
  lastUpdated: number;
}

export interface StoredReaderPreferences {
  batchMode?: 'chapters' | 'words';
  batchSize?: number;
}

export interface LastReadCardData {
  slug: string;
  title: string;
  coverImage: string;
  totalChapters: number;
  lastChapter: number;
  lastUpdated: number;
  batchMode: 'chapters' | 'words';
  batchSize: number;
  resumeUrl: string;
}

interface BuildLastReadCardDataInput {
  novelSeeds: LastReadNovelSeed[];
  progressEntries: StoredNovelProgress[];
  preferences: StoredReaderPreferences | null;
}

const DEFAULT_PREFERENCES = {
  batchMode: 'chapters' as const,
  batchSize: 5,
};

const DEFAULT_WORDS_BATCH_SIZE = 5000;

function normalizePreferences(preferences: StoredReaderPreferences | null) {
  const batchMode = preferences?.batchMode === 'words' ? 'words' : 'chapters';
  const rawBatchSize = typeof preferences?.batchSize === 'number' && Number.isFinite(preferences.batchSize)
    ? preferences.batchSize
    : (batchMode === 'words' ? DEFAULT_WORDS_BATCH_SIZE : DEFAULT_PREFERENCES.batchSize);

  const batchSize = batchMode === 'words'
    ? (rawBatchSize >= 1000 && rawBatchSize <= 25000 ? rawBatchSize : DEFAULT_WORDS_BATCH_SIZE)
    : (rawBatchSize >= 1 && rawBatchSize <= 12 ? rawBatchSize : DEFAULT_PREFERENCES.batchSize);

  return {
    batchMode,
    batchSize,
  };
}

function isValidProgress(progress: StoredNovelProgress) {
  return Boolean(
    progress.slug &&
    typeof progress.lastChapter === 'number' &&
    Number.isInteger(progress.lastChapter) &&
    progress.lastChapter >= 1 &&
    typeof progress.lastUpdated === 'number' &&
    Number.isFinite(progress.lastUpdated) &&
    progress.lastUpdated >= 0,
  );
}

export function buildLastReadCardData(input: BuildLastReadCardDataInput): LastReadCardData | null {
  const { novelSeeds, progressEntries, preferences } = input;
  const normalizedPreferences = normalizePreferences(preferences);

  const latestValidProgress = [...progressEntries]
    .filter(isValidProgress)
    .sort((left, right) => right.lastUpdated - left.lastUpdated)
    .find((progress) => novelSeeds.some((novel) => novel.slug === progress.slug));

  if (!latestValidProgress) {
    return null;
  }

  const matchedNovel = novelSeeds.find((novel) => novel.slug === latestValidProgress.slug);

  if (!matchedNovel) {
    return null;
  }

  return {
    slug: matchedNovel.slug,
    title: matchedNovel.title,
    coverImage: matchedNovel.coverImage,
    totalChapters: matchedNovel.totalChapters,
    lastChapter: latestValidProgress.lastChapter,
    lastUpdated: latestValidProgress.lastUpdated,
    batchMode: normalizedPreferences.batchMode,
    batchSize: normalizedPreferences.batchSize,
    resumeUrl: `/novels/${matchedNovel.slug}/read?start=${latestValidProgress.lastChapter}&mode=${normalizedPreferences.batchMode}&size=${normalizedPreferences.batchSize}`,
  };
}
