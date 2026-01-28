import { describe, it, expect } from "bun:test"
import { parseGithubUrl } from "./url"

describe("parseGithubUrl", () => {
  it("parses standard HTTPS URL", () => {
    const result = parseGithubUrl("https://github.com/owner/repo")
    expect(result).toEqual({ owner: "owner", repo: "repo" })
  })

  it("parses HTTPS URL with .git suffix", () => {
    const result = parseGithubUrl("https://github.com/owner/repo.git")
    expect(result).toEqual({ owner: "owner", repo: "repo" })
  })

  it("parses SSH git URL", () => {
    const result = parseGithubUrl("git@github.com:owner/repo")
    expect(result).toEqual({ owner: "owner", repo: "repo" })
  })

  it("parses SSH git URL with .git suffix", () => {
    const result = parseGithubUrl("git@github.com:owner/repo.git")
    expect(result).toEqual({ owner: "owner", repo: "repo" })
  })

  it("parses org URL with dash", () => {
    const result = parseGithubUrl("https://github.com/my-org/my-repo")
    expect(result).toEqual({ owner: "my-org", repo: "my-repo" })
  })

  it("parses repo name with dashes", () => {
    const result = parseGithubUrl("https://github.com/owner/my-awesome-repo")
    expect(result).toEqual({ owner: "owner", repo: "my-awesome-repo" })
  })

  it("throws on non-GitHub URL", () => {
    expect(() => parseGithubUrl("https://gitlab.com/owner/repo")).toThrow()
  })

  it("throws on invalid URL format", () => {
    expect(() => parseGithubUrl("not-a-url")).toThrow()
  })

  it("throws on empty string", () => {
    expect(() => parseGithubUrl("")).toThrow()
  })

  it("throws on URL with only owner", () => {
    expect(() => parseGithubUrl("https://github.com/owner")).toThrow()
  })
})
