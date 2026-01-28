import { regex } from "arkregex"

const githubUrlRegex = regex(
  "(?:https://|git@)github\\.com[/:](?<owner>[^/]+)/(?<repo>[^/]+?)(?:\\.git)?$",
)

export const parseGithubUrl = (url: string) => {
  const match = url.match(githubUrlRegex)
  if (!match || !match.groups) {
    throw new Error(`Invalid GitHub URL: ${url}`)
  }

  const owner = match.groups.owner
  const repo = match.groups.repo
  if (owner === undefined || repo === undefined) {
    throw new Error(`Invalid GitHub URL: ${url}`)
  }

  return { owner, repo }
}
