import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, mkdir, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
	loadIndex,
	findNovel,
	getNovelFiles,
	removeFromIndex,
} from "../../../scripts/delete-novel.mjs";

describe("novel-deletion", () => {
	let testDir: string;
	let novelsDir: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "novel-del-"));
		novelsDir = join(testDir, "novels");
		await mkdir(novelsDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	async function createIndex(novels: Array<{ slug: string; title: string; totalChapters: number }>) {
		const index = {
			version: "1.0",
			generated: new Date().toISOString(),
			novels: novels.map((n) => ({
				id: n.slug,
				title: n.title,
				slug: n.slug,
				cover: `/novels/${n.slug}/cover.jpg`,
				totalChapters: n.totalChapters,
				bundles: Math.ceil(n.totalChapters / 200),
				bundleSize: 200,
				source: "test",
				lastUpdated: "2026-01-01",
				authors: [],
				synopsis: "",
				genres: [],
				sourceUrl: "",
			})),
		};
		await writeFile(join(novelsDir, "index.json"), JSON.stringify(index, null, 2));
		return index;
	}

	async function createNovelDir(slug: string, files: string[]) {
		const dir = join(novelsDir, slug);
		await mkdir(dir, { recursive: true });
		for (const file of files) {
			await writeFile(join(dir, file), "{}");
		}
		return dir;
	}

	describe("loadIndex", () => {
		it("should load and parse index.json", async () => {
			await createIndex([{ slug: "test-novel", title: "Test", totalChapters: 10 }]);
			const result = await loadIndex(novelsDir);
			expect(result.novels).toHaveLength(1);
			expect(result.novels[0].slug).toBe("test-novel");
		});

		it("should throw when index.json missing", async () => {
			await expect(loadIndex(join(testDir, "nonexistent"))).rejects.toThrow();
		});

		it("should throw on invalid JSON", async () => {
			await writeFile(join(novelsDir, "index.json"), "not json");
			await expect(loadIndex(novelsDir)).rejects.toThrow();
		});

		it("throws when index.json is valid JSON but missing novels array", async () => {
			const indexPath = join(novelsDir, "index.json");
			await writeFile(indexPath, JSON.stringify({ version: "1.0" }));
			await expect(loadIndex(novelsDir)).rejects.toThrow('missing "novels" array');
		});
	});

	describe("findNovel", () => {
		it("should find existing novel by slug", async () => {
			const index = await createIndex([
				{ slug: "novel-a", title: "Novel A", totalChapters: 10 },
				{ slug: "novel-b", title: "Novel B", totalChapters: 20 },
			]);
			const result = findNovel(index, "novel-a");
			expect(result).toBeDefined();
			expect(result!.title).toBe("Novel A");
		});

		it("should return undefined for non-existent slug", async () => {
			const index = await createIndex([{ slug: "novel-a", title: "Novel A", totalChapters: 10 }]);
			const result = findNovel(index, "does-not-exist");
			expect(result).toBeUndefined();
		});
	});

	describe("getNovelFiles", () => {
		it("should list all files in novel directory", async () => {
			await createNovelDir("test-novel", ["metadata.json", "vol-001.json.br", "cover.jpg"]);
			const files = await getNovelFiles(join(novelsDir, "test-novel"));
			expect(files).toHaveLength(3);
			expect(files).toContain("metadata.json");
			expect(files).toContain("vol-001.json.br");
			expect(files).toContain("cover.jpg");
		});

		it("should return empty array for non-existent directory", async () => {
			const files = await getNovelFiles(join(novelsDir, "nope"));
			expect(files).toEqual([]);
		});
	});

	describe("removeFromIndex", () => {
		it("should remove the target novel from index", async () => {
			await createIndex([
				{ slug: "keep-a", title: "Keep A", totalChapters: 10 },
				{ slug: "remove-me", title: "Remove", totalChapters: 5 },
				{ slug: "keep-b", title: "Keep B", totalChapters: 15 },
			]);
			const index = await loadIndex(novelsDir);
			const updated = removeFromIndex(index, "remove-me");

			expect(updated.novels).toHaveLength(2);
			expect(updated.novels.find((n) => n.slug === "remove-me")).toBeUndefined();
			expect(updated.novels.find((n) => n.slug === "keep-a")).toBeDefined();
			expect(updated.novels.find((n) => n.slug === "keep-b")).toBeDefined();
		});

		it("should return unchanged index if slug not found", async () => {
			await createIndex([{ slug: "novel-a", title: "Novel A", totalChapters: 10 }]);
			const index = await loadIndex(novelsDir);
			const updated = removeFromIndex(index, "nope");
			expect(updated.novels).toHaveLength(1);
		});

		it("should update the generated timestamp", async () => {
			await createIndex([{ slug: "a", title: "A", totalChapters: 1 }, { slug: "b", title: "B", totalChapters: 2 }]);
			const index = await loadIndex(novelsDir);
			const oldGenerated = index.generated;
			// Small delay to ensure different timestamp
			await new Promise((r) => setTimeout(r, 10));
			const updated = removeFromIndex(index, "a");
			expect(updated.generated).not.toBe(oldGenerated);
		});

		it("should not mutate the original index object", async () => {
			await createIndex([
				{ slug: "a", title: "A", totalChapters: 1 },
				{ slug: "b", title: "B", totalChapters: 2 },
			]);
			const index = await loadIndex(novelsDir);
			const originalCount = index.novels.length;
			removeFromIndex(index, "a");
			expect(index.novels).toHaveLength(originalCount);
		});
	});
});
