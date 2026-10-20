import { expect, it } from "vitest";
import { parseCollectionDeleteQuery, validateAlbumCollectionCreate, validateAlbumCollectionPatch } from "./album-collection-security";
it("validates bounded collection metadata, strict keys and exact revisions", () => {
  expect(validateAlbumCollectionCreate({title:"  夏日  ",description:""})).toEqual({title:"夏日",description:""});
  for (const input of [{title:" ",description:""},{title:"a".repeat(101),description:""},{title:"a",description:"a".repeat(1001)},{title:"a",description:"",ownerId:"fake"}])
    expect(() => validateAlbumCollectionCreate(input)).toThrow();
  for (const revision of [0,-1,1.5,"1",null,Number.MAX_SAFE_INTEGER+1])
    expect(() => validateAlbumCollectionPatch({title:"a",description:"",revision})).toThrow();
  expect(validateAlbumCollectionPatch({title:"a",description:"",revision:1}).revision).toBe(1);
});
it("accepts only one safe positive revision query", () => {
  expect(parseCollectionDeleteQuery(new URLSearchParams("revision=2"))).toBe(2);
  for (const input of ["","revision=0","revision=01","revision=1&revision=2","revision=1&owner=x","revision=9007199254740992"])
    expect(() => parseCollectionDeleteQuery(new URLSearchParams(input))).toThrow();
});
