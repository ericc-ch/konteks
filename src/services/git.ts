import { Command, CommandExecutor, Path } from "@effect/platform"
import { Data, Effect, Schema } from "effect"
import { parseGithubUrl } from "../lib/url"

export const RepoStatus = Schema.Union(
  Schema.Struct({ state: Schema.Literal("missing") }),
  Schema.Struct({ state: Schema.Literal("up to date") }),
  Schema.Struct({
    state: Schema.Literal("behind"),
    commitCount: Schema.Number,
  }),
  Schema.Struct({ state: Schema.Literal("modified") }),
)

export type RepoStatus = typeof RepoStatus.Type

export class GitError extends Data.TaggedError("GitError")<{
  readonly message: string
  readonly exitCode?: number
}> {}

export class Git extends Effect.Service<Git>()("Git", {
  effect: Effect.gen(function* () {
    const executor = yield* CommandExecutor.CommandExecutor
    const path = yield* Path.Path

    const cwd = yield* Effect.sync(() => process.cwd())
    const targetDir = path.join(cwd, ".context/")

    return {
      clone: Effect.fn(function* (url: string) {
        const { repo: repoName } = yield* parseGithubUrl(url)
        const command = Command.make(
          "git",
          "clone",
          "--quiet",
          url,
          `${targetDir}/${repoName}`,
        )
        const result = yield* executor.exitCode(command)
        if (result !== 0) {
          return yield* new GitError({
            message: `Failed to clone ${url}`,
            exitCode: result,
          })
        }
      }),

      pull: Effect.fn(function* (url: string) {
        const { repo: repoName } = yield* parseGithubUrl(url)
        const command = Command.make(
          "git",
          "-C",
          `${targetDir}/${repoName}`,
          "pull",
          "--quiet",
        )
        const result = yield* executor.exitCode(command)
        if (result !== 0) {
          return yield* new GitError({
            message: `Failed to pull ${url}`,
            exitCode: result,
          })
        }
      }),

      checkStatus: Effect.fn(function* (url: string) {
        const { repo: repoName } = yield* parseGithubUrl(url)
        const dirPath = `${targetDir}/${repoName}`

        const dirCommand = Command.make("test", "-d", dirPath)
        const dirResult = yield* executor.exitCode(dirCommand)

        if (dirResult !== 0) {
          return { state: "missing" } as const
        }

        const statusCommand = Command.make(
          "git",
          "-C",
          dirPath,
          "status",
          "--porcelain",
        )
        const statusOutput = yield* executor.string(statusCommand)

        if (statusOutput.trim() !== "") {
          return { state: "modified" } as const
        }

        const countCommand = Command.make(
          "git",
          "-C",
          dirPath,
          "rev-list",
          "--count",
          "HEAD..origin/main",
        )
        const countResult = yield* executor.string(countCommand)
        const commitCount = Number.parseInt(countResult.trim(), 10)

        if (commitCount > 0) {
          return { state: "behind", commitCount } as const
        }

        return { state: "up to date" } as const
      }),
    }
  }),
}) {}
