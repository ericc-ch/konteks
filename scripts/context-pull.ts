#!/usr/bin/env bun

import path from "node:path"
import fs from "node:fs"

const rootDir = path.join(import.meta.dir, "..")
const configPath = path.join(rootDir, "konteks.json")

if (!fs.existsSync(configPath)) {
  console.error("konteks.json not found")
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
const contextRoot = path.join(rootDir, config.dir)

if (!fs.existsSync(contextRoot)) {
  fs.mkdirSync(contextRoot, { recursive: true })
}

const githubUrlRegex =
  /(?:https:\/\/|git@)github\.com[/:](?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?$/

const operations = config.repos.map(async (url: string) => {
  const match = url.match(githubUrlRegex)
  const repoName = match?.groups?.repo

  if (!repoName) {
    console.error(`Invalid GitHub URL: ${url}`)
    return
  }

  const repoDir = path.join(contextRoot, repoName)

  if (!fs.existsSync(repoDir)) {
    console.log(`Cloning ${repoName}...`)
    await Bun.$`git clone --depth 1 ${url} ${repoDir}`.quiet()
    console.log(`✓ Cloned ${repoName}`)
  } else {
    console.log(`Pulling ${repoName}...`)
    await Bun.$`git pull`.cwd(repoDir).quiet()
    console.log(`✓ Pulled ${repoName}`)
  }
})

const results = await Promise.allSettled(operations)

const failures = results.filter((r) => r.status === "rejected")
if (failures.length > 0) {
  console.error(`\n${failures.length} operation(s) failed:`)
  for (const f of failures) {
    console.error(`  - ${(f as PromiseRejectedResult).reason.message}`)
  }
}

console.log("Done!")
