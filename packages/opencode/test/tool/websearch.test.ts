import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { Parameters, webSearchProviderLabel } from "../../src/tool/websearch"

describe("websearch parameters", () => {
  test("accepts query only", () => {
    const decode = Schema.decodeUnknownSync(Parameters)
    expect(decode({ query: "test" })).toEqual({ query: "test" })
  })

  test("accepts query with numResults", () => {
    const decode = Schema.decodeUnknownSync(Parameters)
    expect(decode({ query: "test", numResults: 5 })).toEqual({ query: "test", numResults: 5 })
  })

  test("accepts query with continueToken", () => {
    const decode = Schema.decodeUnknownSync(Parameters)
    expect(decode({ query: "test", continueToken: "abc123" })).toEqual({
      query: "test",
      continueToken: "abc123",
    })
  })

  test("requires query field", () => {
    const decode = Schema.decodeUnknownSync(Parameters)
    expect(() => decode({})).toThrow()
  })
})

describe("webSearchProviderLabel", () => {
  test("returns DuckDuckGo label", () => {
    expect(webSearchProviderLabel()).toBe("DuckDuckGo Search")
    expect(webSearchProviderLabel("duckduckgo")).toBe("DuckDuckGo Search")
    expect(webSearchProviderLabel(undefined)).toBe("DuckDuckGo Search")
  })
})
