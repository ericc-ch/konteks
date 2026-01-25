import { FileSystem, Path } from "@effect/platform"
import { Data, Effect, Schema } from "effect"

export class ConfigSchema extends Schema.Class<ConfigSchema>("ConfigSchema")({
  repos: Schema.Array(Schema.String),
}) {}

export class ConfigError extends Data.TaggedError("ConfigError")<{
  message: string
}> {}

const defaultConfig = new ConfigSchema({ repos: [] })
const JsonSchema = Schema.parseJson(ConfigSchema, { space: 2 })

export class Config extends Effect.Service<Config>()("Config", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const cwd = yield* Effect.sync(() => process.cwd())
    const configPath = path.join(cwd, "lazycontext.json")

    const ensureDirExists = Effect.gen(function* () {
      const dirPath = path.join(cwd, ".context")
      yield* fs.makeDirectory(dirPath, { recursive: true })
    })

    const readConfigFile = Effect.gen(function* () {
      const exists = yield* fs.exists(configPath)

      if (!exists) {
        yield* Effect.log(
          "Config file not found at",
          configPath,
          ", returning default config",
        )
        return defaultConfig
      }

      const content = yield* fs.readFileString(configPath)
      yield* Effect.log("Config file found at", configPath)

      return yield* Schema.decodeUnknown(JsonSchema)(content)
    })

    return {
      load: Effect.gen(function* () {
        yield* ensureDirExists
        return yield* readConfigFile
      }),
    }
  }),
}) {}
