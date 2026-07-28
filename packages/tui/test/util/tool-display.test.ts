import { describe, expect, test } from "bun:test"
import { toolDisplayMetadata, webSearchProviderLabel } from "../../src/util/tool-display"

describe("webSearchProviderLabel", () => {
  test("returns DuckDuckGo label", () => {
    expect(webSearchProviderLabel()).toBe("DuckDuckGo Search")
    expect(webSearchProviderLabel("duckduckgo")).toBe("DuckDuckGo Search")
  })
})

describe("toolDisplayMetadata", () => {
  test("returns structured metadata for non-pending states", () => {
    const structured = { provider: "parallel", numResults: 3 }

    expect(toolDisplayMetadata({ status: "running", structured })).toBe(structured)
    expect(toolDisplayMetadata({ status: "completed", structured })).toBe(structured)
    expect(toolDisplayMetadata({ status: "error", structured })).toBe(structured)
  })

  test("does not expose pending or malformed metadata", () => {
    expect(toolDisplayMetadata({ status: "pending", structured: { provider: "exa" } })).toEqual({})
    expect(toolDisplayMetadata({ status: "completed" })).toEqual({})
    expect(toolDisplayMetadata({ status: "completed", structured: null })).toEqual({})
    expect(toolDisplayMetadata({ status: "completed", structured: [] })).toEqual({})
    expect(toolDisplayMetadata(undefined)).toEqual({})
  })
})
