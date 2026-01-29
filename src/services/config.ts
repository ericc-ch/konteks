import { FileSystem, Path } from "@effect/platform"
import { Effect, Schema } from "effect"

export class ConfigSchema extends Schema.Class<ConfigSchema>("ConfigSchema")({
  dir: Schema.String,
  repos: Schema.Array(Schema.String),
}) {}

const defaultConfig = new ConfigSchema({ dir: ".context/", repos: [] })
const JsonSchema = Schema.parseJson(ConfigSchema, { space: 2 })

export class Config extends Effect.Service<Config>()("Config", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const cwd = process.cwd()
    const configPath = path.join(cwd, "konteks.json")

    // Load config during service construction
    const config = yield* Effect.if(fs.exists(configPath), {
      onTrue: () =>
        Effect.gen(function* () {
          const content = yield* fs.readFileString(configPath)
          yield* Effect.log("Config file found at", configPath)
          return yield* Schema.decodeUnknown(JsonSchema)(content)
        }),
      onFalse: () =>
        Effect.gen(function* () {
          yield* Effect.log("Config file not found at", configPath)
          return defaultConfig
        }),
    })

    return {
      load: Effect.succeed(config),

      save: Effect.gen(function* () {
        const exists = yield* fs.exists(configPath)
        if (exists) {
          yield* Effect.log("Config file already exists at", configPath)
          return
        }
        const content = yield* Schema.encode(JsonSchema)(defaultConfig)
        yield* fs.writeFileString(configPath, content)
        yield* Effect.log("Config file created at", configPath)
      }),
    }
  }),
}) {}
