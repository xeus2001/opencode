import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import DESCRIPTION from "./websearch.txt"
import * as DuckDuckScrape from "duck-duck-scrape"

export function webSearchProviderLabel(_provider?: unknown) {
  return "DuckDuckGo Search"
}

export const Parameters = Schema.Struct({
  query: Schema.String.annotate({ description: "Web search query" }),
  numResults: Schema.optional(Schema.Number.annotate({
    description: "Number of search results to return (default: 8)",
  })),
})

const MAX_NUM_RESULTS = 20

const formatResults = (results: DuckDuckScrape.SearchResult[]): string => {
  if (results.length === 0) return "No search results found. Please try a different query."
  return results
    .map((result, i) => `${i + 1}. ${result.title}\n   ${result.description}\n   ${result.url}`)
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
        const ddgResults = yield* Effect.promise(() =>
          DuckDuckScrape.search(params.query, {
            safeSearch: DuckDuckScrape.SafeSearchType.MODERATE,
            locale: "en-us",
            region: "wt-wt",
            marketRegion: "US",
          }),
        ).pipe(
          Effect.timeoutOrElse({
            duration: 25_000,
            orElse: () => Effect.fail(new Error("Web search request timed out")),
          }),
        )

        return {
          output: formatResults(ddgResults.results.slice(0, numResults)),
          title: `DuckDuckGo Search: ${params.query}`,
          metadata: {},
        }
      }).pipe(Effect.orDie),
  }),
)
