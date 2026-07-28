import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import DESCRIPTION from "./websearch.txt"
import { DDGSearch } from "@opencode-ai/core/tool/ddg-search"

export function webSearchProviderLabel(_provider?: unknown) {
  return "DuckDuckGo Search"
}

export const Parameters = Schema.Struct({
  query: Schema.String.annotate({ description: "Web search query" }),
  numResults: Schema.optional(Schema.Number.annotate({
    description: "Number of search results to return (default: 8)",
  })),
  continueToken: Schema.optional(Schema.String).annotate({
    description: "Continuation token from a previous search to load more results",
  }),
})

const formatResults = (results: DDGSearch.SearchResult[]): string => {
  if (results.length === 0) return "No search results found. Please try a different query."
  return results
    .map((result, i) => `${i + 1}. ${result.title}\n   ${result.snippet}\n   ${result.url}`)
    .join("\n\n")
}

export const WebSearchTool = Tool.define(
  "websearch",
  Effect.succeed({
    get description() {
      return DESCRIPTION.replace("{{year}}", new Date().getFullYear().toString())
    },
    parameters: Parameters,
    execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
      Effect.gen(function* () {
        yield* ctx.metadata({ title: `DuckDuckGo Search "${params.query}"` })

        yield* ctx.ask({
          permission: "websearch",
          patterns: [params.query],
          always: ["*"],
          metadata: {
            query: params.query,
            numResults: params.numResults,
          },
        })

        const numResults = params.numResults ?? 8
        const { results, continueToken } = yield* DDGSearch.search(params.query, numResults)
        const text = formatResults(results)
        const continuation = continueToken
          ? `\n\n[CONTINUATION_TOKEN: ${continueToken}]\nUse websearch with continueToken to load more results.`
          : ""

        return {
          output: text + continuation,
          title: `DuckDuckGo Search: ${params.query}`,
          metadata: {},
        }
      }).pipe(Effect.orDie),
  }),
)
