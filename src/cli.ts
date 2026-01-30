import { Command } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer, pipe } from "effect"
import os from "node:os"
import packageJson from "../package.json"
import { Config } from "./services/config"
import { Git } from "./services/git"

const concurrency = os.availableParallelism() / 2

const init = Command.make("init", {}, () =>
  Effect.gen(function* () {
    const config = yield* Config
    yield* config.save
  }),
)

const sync = Command.make("sync", {}, () =>
  Effect.gen(function* () {
    const config = yield* Config
    const git = yield* Git
    const { repos } = yield* config.load

    if (repos.length === 0) {
      yield* Effect.log("No repos configured. Add repos to konteks.json")
      return
    }

    yield* Effect.all(
      repos.map((url) => git.sync(url)),
      { concurrency },
    )
  }),
)

const konteks = Command.make("konteks").pipe(
  Command.withSubcommands([init, sync]),
)

const cli = Command.run(konteks, {
  name: "konteks",
  version: `v${packageJson.version}`,
})

const ConfigLive = Config.Default.pipe(Layer.provide(BunContext.layer))

const GitLive = Git.Default.pipe(
  Layer.provide(ConfigLive),
  Layer.provide(BunContext.layer),
)

const MainLayer = Layer.mergeAll(ConfigLive, GitLive, BunContext.layer)

pipe(cli(process.argv), Effect.provide(MainLayer), BunRuntime.runMain)
