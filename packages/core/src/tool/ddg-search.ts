export * as DDGSearch from "./ddg-search"

import { Duration, Effect, Schema } from "effect"
import { Parser } from "htmlparser2"

const DDG_URL = "https://html.duckduckgo.com/html/"
const DDG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:153.0) Gecko/20100101 Firefox/153.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://html.duckduckgo.com/",
  Origin: "https://html.duckduckgo.com",
  Cookie: "kl=en-us",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
}

export interface SearchResult {
  readonly title: string
  readonly url: string
  readonly hostname: string
  readonly snippet: string
}

interface PageResults {
  readonly results: SearchResult[]
  readonly vqd: string
  readonly offset: number
}

const emptyPage: PageResults = { results: [], vqd: "", offset: 0 }

const searchPage = (
  query: string,
  vqd: string | undefined,
  offset: number,
): Effect.Effect<PageResults> => {
  const params: string[] = [`q=${encodeURIComponent(query)}`]
  if (offset > 0) params.push(`s=${offset}`, `vqd=${vqd}`)
  const form = params.join("&")

  return Effect.promise(() =>
    fetch(DDG_URL, {
      method: "POST",
      headers: {
        ...DDG_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }).then((res) => {
      if (!res.ok) throw new Error(`DDG returned status ${res.status}`)
      return res.text()
    }),
  ).pipe(
    Effect.map(parseResults),
    Effect.catch(() => Effect.succeed(emptyPage)),
    Effect.timeoutOrElse({
      duration: Duration.seconds(20),
      orElse: () => Effect.succeed(emptyPage),
    }),
  )
}

const parseResults = (html: string): PageResults => {
  const results: SearchResult[] = []
  let vqd = ""
  let resultDepth = 0
  let inTitle = false
  let inSnippet = false
  let currentTitle = ""
  let currentUrl = ""
  let currentSnippet = ""

  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === "input" && attrs.type === "hidden" && attrs.name === "vqd") {
        vqd = attrs.value ?? ""
        return
      }
      if (name === "div" && attrs.class && attrs.class.includes("result__body")) {
        resultDepth++
        currentTitle = ""
        currentUrl = ""
        currentSnippet = ""
        return
      }
      if (name === "div") {
        if (resultDepth > 0) resultDepth++
        return
      }
      if (resultDepth === 0) return
      if (name === "a" && attrs.class === "result__a") {
        inTitle = true
        currentUrl = attrs.href ?? ""
        return
      }
      if (name === "a" && attrs.class === "result__snippet") {
        inSnippet = true
        return
      }
    },
    ontext(text) {
      if (resultDepth === 0) return
      if (inTitle) {
        currentTitle += text
      } else if (inSnippet) {
        currentSnippet += text
      }
    },
    onclosetag(name) {
      if (name === "a" && inTitle) {
        inTitle = false
        return
      }
      if (name === "a" && inSnippet) {
        inSnippet = false
        return
      }
      if (name === "div" && resultDepth > 0) {
        resultDepth--
        if (resultDepth === 0 && currentTitle.trim() && currentUrl) {
          results.push({
            title: currentTitle.trim(),
            url: currentUrl,
            hostname: (() => {
              try {
                return new URL(currentUrl).hostname
              } catch {
                return ""
              }
            })(),
            snippet: currentSnippet
              .replace(/<[^>]*>/g, "")
              .replace(/\t/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
          })
        }
      }
    },
  })
  parser.write(html)
  parser.end()

  return { results, vqd, offset: results.length }
}

export function search(
  query: string,
  numResults: number,
): Effect.Effect<{ readonly results: SearchResult[]; readonly continueToken?: string }> {
  return Effect.gen(function* () {
    const allResults: SearchResult[] = []
    let currentVqd = ""
    let offset = 0

    while (allResults.length < numResults) {
      const page = yield* searchPage(query, currentVqd, offset)
      allResults.push(...page.results)
      if (page.results.length === 0) break
      currentVqd = page.vqd
      offset += page.results.length
    }

    const continueToken =
      allResults.length > 0 && currentVqd
        ? btoa(
            JSON.stringify({
              query,
              vqd: currentVqd,
              offset,
            }),
          )
        : undefined

    return { results: allResults, continueToken }
  })
}
