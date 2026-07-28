import { describe, expect, test } from "bun:test"
import { DDGSearch } from "../../src/tool/ddg-search"
import { Effect } from "effect"

describe("ddg-search", () => {
  test("searches DDG and returns results", async () => {
    const result = await Effect.runPromise(DDGSearch.search("AMD 7900 XTX price", 8))
    expect(result.results.length).toBeGreaterThan(0)
    for (const r of result.results) {
      expect(r.title).toBeTruthy()
      expect(r.url).toBeTruthy()
      expect(r.hostname).toBeTruthy()
    }
    console.log(`Found ${result.results.length} results`)
  }, 30_000)

  test("search returns continuation token when more pages available", async () => {
    const result = await Effect.runPromise(DDGSearch.search("AMD 7900 XTX price", 8))
    expect(result.continueToken).toBeDefined()
    expect(typeof result.continueToken).toBe("string")
  }, 30_000)
})
