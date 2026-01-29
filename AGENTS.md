## Commands

### Core Commands

```bash
bun run build        # Build with tsdown (outputs to dist/)
bun run typecheck    # Type-check with tsgo (tsc wrapper)
bun run lint         # Lint with oxlint --type-aware
bun run format       # Format with prettier --write
bun start            # Run CLI entry point with Bun
```

### Git Hooks

Pre-commit runs `bun run format`. Pre-push runs `bun run typecheck && bun test && bun run lint`.

### Testing

```bash
bun test             # Run all tests
bun test <file>      # Run tests in specific file
```

## Code Style

### General

- Use Effect framework for all side effects and async operations

### Imports

```typescript
// Group by: external > @effect/* > local
import { X, Y } from "some-package"
import { A, B } from "@effect/platform"
import { C } from "effect"
import { helper } from "./local/file"
```

Use named imports only. Avoid default exports.

### Effect Framework Patterns

#### Services

```typescript
export class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function* () {
    const dep = yield* SomeDependency
    return {
      method: Effect.fn(function* (input: string) {
        // implementation
      }),
    }
  }),
}) {}
```

#### Tagged Errors

```typescript
export class MyError extends Data.TaggedError("MyError")<{
  readonly message: string
  readonly exitCode?: number
}> {}
```

#### Effect.gen Syntax

```typescript
Effect.gen(function* () {
  const result = yield* someEffect
  const data = yield* Effect.sync(() => compute())
  return result
})
```

### Naming Conventions

- **Classes**: PascalCase (`GitService`, `ConfigLoader`)
- **Functions/variables**: camelCase (`parseGithubUrl`, `targetDir`)
- **Constants**: SCREAMING_SASE for config values, camelCase for exported values
- **Files**: kebab-case (`context-pull.ts`, `git-service.ts`)

### Error Handling

- Use `Data.TaggedError` for domain errors
- Propagate errors through Effect (`yield*` or `pipe`)
- Never use try/catch outside Effect context
- Provide meaningful error messages with context

### File Structure

```
src/
  cli.ts           # Entry point
  main.ts          # Main exports
  lib/             # Utilities and helpers
  services/        # Effect services
```
