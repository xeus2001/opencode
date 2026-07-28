import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { WebSearchTool } from "@opencode-ai/core/tool/websearch"

describe("WebSearchTool input schema", () => {
  test("rejects out-of-range numResults", () => {
    const decode = Schema.decodeUnknownSync(WebSearchTool.Input)
    expect(() => decode({ query: "x", numResults: 0 })).toThrow()
    expect(() => decode({ query: "x", numResults: WebSearchTool.MAX_NUM_RESULTS + 1 })).toThrow()
  })

  test("accepts valid input", () => {
    const decode = Schema.decodeUnknownSync(WebSearchTool.Input)
    expect(decode({ query: "test" })).toEqual({ query: "test" })
    expect(decode({ query: "test", numResults: 5 })).toEqual({ query: "test", numResults: 5 })
  })

  test("requires query field", () => {
    const decode = Schema.decodeUnknownSync(WebSearchTool.Input)
    expect(() => decode({})).toThrow()
  })
})

describe("WebSearchTool constants", () => {
  test("NO_RESULTS message", () => {
    expect(WebSearchTool.NO_RESULTS).toBe("No search results found. Please try a different query.")
  })

  test("MAX_NUM_RESULTS is 20", () => {
    expect(WebSearchTool.MAX_NUM_RESULTS).toBe(20)
  })

  test("name is websearch", () => {
    expect(WebSearchTool.name).toBe("websearch")
  })
})
