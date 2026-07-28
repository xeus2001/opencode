export * as WebSearchTool from "./websearch"

import { ToolFailure } from "@opencode-ai/llm"
import { Effect, Layer, Schema } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { PermissionV2 } from "../permission"
import { Tool } from "./tool"
import { Tools } from "./tools"
import { ToolRegistry } from "./registry"
import { DDGSearch } from "./ddg-search"

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
  continueToken: Schema.optional(Schema.String).annotate({
    description: "Continuation token from a previous search to load more results",
  }),
})

const Output = Schema.Struct({
  text: Schema.String,
})

const formatResults = (results: DDGSearch.SearchResult[]): string => {
  if (results.length === 0) return NO_RESULTS
  return results
    .map((result, i) => `${i + 1}. ${result.title}\n   ${result.snippet}\n   ${result.url}`)
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
              const { results, continueToken } = yield* DDGSearch.search(input.query, numResults)
              const text = formatResults(results)
              const continuation = continueToken
                ? `\n\n[CONTINUATION_TOKEN: ${continueToken}]\nUse websearch with continueToken to load more results.`
                : ""

              return {
                text: text + continuation,
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
