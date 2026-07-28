export * as WebSearchTool from "./websearch"

import { ToolFailure } from "@opencode-ai/llm"
import { Context, Duration, Effect, Layer, Schema } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { PermissionV2 } from "../permission"
import { Tool } from "./tool"
import { Tools } from "./tools"
import { ToolRegistry } from "./registry"
import * as DuckDuckScrape from "duck-duck-scrape"

export const name = "websearch"
export const NO_RESULTS = "No search results found. Please try a different query."
export const MAX_NUM_RESULTS = 20

/**
 * Local web search backed by DuckDuckGo. No API key required.
 */
export const description = `Search the web using DuckDuckGo. Use this for current information beyond knowledge cutoff.

The current year is ${new Date().getFullYear()}. Use this year when searching for recent information or current events.`

export const Input = Schema.Struct({
  query: Schema.String.annotate({ description: "Web search query" }),
  numResults: Schema.optional(Schema.Number.check(
    Schema.isGreaterThan(0),
    Schema.isLessThanOrEqualTo(MAX_NUM_RESULTS),
  )).annotate({
    description: `Number of search results to return (default: 8, maximum: ${MAX_NUM_RESULTS})`,
  }),
})

const Output = Schema.Struct({
  text: Schema.String,
})

const formatResults = (results: DuckDuckScrape.SearchResult[]): string => {
  if (results.length === 0) return NO_RESULTS
  return results
    .map((result, i) => `${i + 1}. ${result.title}\n   ${result.description}\n   ${result.url}`)
    .join("\n\n")
}

const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const tools = yield* Tools.Service
    const permission = yield* PermissionV2.Service

    yield* tools
      .register({
        [name]: Tool.make({
          description,
          input: Input,
          output: Output,
          toModelOutput: ({ output }) => [{ type: "text", text: output.text }],
          execute: (input, context) =>
            Effect.gen(function* () {
              yield* permission.assert({
                action: name,
                resources: [input.query],
                save: ["*"],
                metadata: input,
                sessionID: context.sessionID,
                agent: context.agent,
                source: { type: "tool", messageID: context.assistantMessageID, callID: context.toolCallID },
              })

              const numResults = input.numResults ?? 8
              const ddgResults = yield* Effect.promise(() =>
                DuckDuckScrape.search(input.query, {
                  safeSearch: DuckDuckScrape.SafeSearchType.MODERATE,
                  locale: "en-us",
                  region: "wt-wt",
                  marketRegion: "US",
                }),
              ).pipe(
                Effect.timeoutOrElse({
                  duration: Duration.seconds(25),
                  orElse: () => Effect.fail(new Error("Web search request timed out")),
                }),
              )

              return {
                text: formatResults(ddgResults.results.slice(0, numResults)),
              }
            }).pipe(Effect.mapError(() => new ToolFailure({ message: `Unable to search the web for ${input.query}` }))),
        }),
      })
      .pipe(Effect.orDie)
  }),
)

export const node = makeLocationNode({
  name: "tool/websearch",
  layer,
  deps: [ToolRegistry.node, PermissionV2.node],
})
