import { Command, CommandExecutor, FileSystem, Path } from "@effect/platform"
import { Data, Effect, Stream, pipe } from "effect"
import { parseGithubUrl } from "../lib/url"
import { Config } from "./config"

export class GitError extends Data.TaggedError("GitError")<{
  readonly message: string
  readonly exitCode: number
}> {}

export class Git extends Effect.Service<Git>()("Git", {
  effect: Effect.gen(function* () {
    const executor = yield* CommandExecutor.CommandExecutor
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const config = yield* Config
    const { dir } = yield* config.load

    const cwd = process.cwd()
    const targetDir = path.join(cwd, dir)

    const runGitCommand = Effect.fn(function* (command: Command.Command) {
      const process = yield* executor.start(command)
      const [stdout, stderr, exitCode] = yield* Effect.all([
        pipe(
          process.stdout,
          Stream.decodeText(),
          Stream.runFold("", (acc, chunk) => acc + chunk),
        ),
        pipe(
          process.stderr,
          Stream.decodeText(),
          Stream.runFold("", (acc, chunk) => acc + chunk),
        ),
        process.exitCode,
      ])

      return { stdout, stderr, exitCode }
    }, Effect.scoped)

    const clone = Effect.fn(function* (url: string) {
      const { repo } = parseGithubUrl(url)
      const { exitCode, stderr, stdout } = yield* Command.make(
        "git",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        url,
        `${targetDir}/${repo}`,
      ).pipe(runGitCommand)

      yield* Effect.log(`Cloned ${url}: ${stdout}`)

      if (exitCode !== 0) {
        return yield* new GitError({
          message: `Failed to clone ${url}: ${stderr}`,
          exitCode,
        })
      }
    })

    const pull = Effect.fn(function* (url: string) {
      const { repo: repoName } = parseGithubUrl(url)
      const { exitCode, stderr, stdout } = yield* Command.make(
        "git",
        "-C",
        `${targetDir}/${repoName}`,
        "pull",
      ).pipe(runGitCommand)

      yield* Effect.log(`Pulled ${url}: ${stdout}`)

      if (exitCode !== 0) {
        return yield* new GitError({
          message: `Failed to pull ${url}: ${stderr}`,
          exitCode,
        })
      }
    })

    const sync = Effect.fn(function* (url: string) {
      const { repo: repoName } = parseGithubUrl(url)
      const dirPath = `${targetDir}/${repoName}`

      const exists = yield* fs.exists(dirPath)

      if (!exists) {
        return yield* clone(url)
      }
      return yield* pull(url)
    })

    return { clone, pull, sync }
  }),
}) {}
