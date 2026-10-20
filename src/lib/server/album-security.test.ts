import { expect, it } from "vitest";
import { parseAlbumQuery, validateAlbumCreate, validateAlbumPatch } from "./album-security";
const mediaId = "44444444-4444-4444-8444-444444444444";
const draft = { caption: "花园", alt: "午后", date: "2026-10-14" };
it("accepts bounded plain text and true calendar dates, including leap days and empty dates", () => {
  for (const date of ["", "2024-02-29", "0099-01-01", "2026-10-14"]) {
    expect(validateAlbumCreate({ mediaId, ...draft, date })).toEqual({ mediaId, ...draft, date });
    expect(validateAlbumPatch({ ...draft, date, revision: 1, published: false })).toEqual({ ...draft, date, revision: 1, published: false });
  }
});
it.each(["2025-02-29", "2026-04-31", "2026-13-01", "0000-01-01", "2026-1-1", "今天"])("rejects invalid calendar date %s", (date) => {
  expect(() => validateAlbumCreate({ mediaId, ...draft, date })).toThrow();
});
it("rejects untrusted keys, oversized metadata, malformed identity and unsafe revisions", () => {
  for (const value of [
    { mediaId, ...draft, storageKey: "blob/fake.jpg" },
    { mediaId, ...draft, published: true },
    { mediaId, ...draft, caption: "a".repeat(1001) },
    { mediaId, ...draft, alt: "a".repeat(501) },
    { mediaId: "fake", ...draft },
    { mediaId, ...draft, date: null },
  ]) expect(() => validateAlbumCreate(value)).toThrow();
  for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1", null])
    expect(() => validateAlbumPatch({ ...draft, revision, published: true })).toThrow();
  expect(() => validateAlbumPatch({ ...draft, revision: 1, published: "true" })).toThrow();
  expect(() => validateAlbumPatch({ ...draft, revision: 1, published: true, mediaId })).toThrow();
});
it("parses only unique bounded integer pagination values", () => {
  expect(parseAlbumQuery(new URLSearchParams())).toEqual({ page: 1, pageSize: 15 });
  expect(parseAlbumQuery(new URLSearchParams("page=10000&pageSize=100"))).toEqual({ page: 10000, pageSize: 100 });
  for (const query of ["page=0", "page=-1", "page=10001", "page=1.5", "page=01", "page=1&page=2", "pageSize=101", "pageSize=0", "owner=x", "page=Infinity"])
    expect(() => parseAlbumQuery(new URLSearchParams(query))).toThrow();
});

it("accepts explicit collection moves and validates collection filters", () => {
  expect(validateAlbumCreate({ mediaId, ...draft, collectionId: mediaId }).collectionId).toBe(mediaId);
  expect(validateAlbumPatch({ ...draft, revision: 1, published: false, collectionId: null }).collectionId).toBeNull();
  expect(parseAlbumQuery(new URLSearchParams(`collectionId=${mediaId}`))).toEqual({ page: 1, pageSize: 15, collectionId: mediaId });
  expect(parseAlbumQuery(new URLSearchParams("collectionId=unassigned")).collectionId).toBe("unassigned");
  for (const value of ["", "fake", "all"])
    expect(() => parseAlbumQuery(new URLSearchParams(`collectionId=${value}`))).toThrow();
  expect(() => parseAlbumQuery(new URLSearchParams(`collectionId=${mediaId}&collectionId=${mediaId}`))).toThrow();
  expect(() => validateAlbumCreate({ mediaId, ...draft, collectionId: "fake" })).toThrow();
});
