# Graph Report - savills-pm-command-center  (2026-05-22)

## Corpus Check
- 60 files · ~27,334 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 634 nodes · 627 edges · 48 communities (40 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d01849e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 14 edges
3. `Convex Create Component` - 12 edges
4. `Convex Quickstart` - 12 edges
5. `Convex guidelines` - 12 edges
6. `Hot Path Rules` - 11 edges
7. `Convex Auth` - 11 edges
8. `Migrations Component Reference` - 11 edges
9. `skills` - 10 edges
10. `Convex Performance Audit` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Project README` --references--> `Convex Auth Configuration`  [EXTRACTED]
  README.md → convex/auth.config.ts
- `Convex Setup Auth Skill` --references--> `Convex Auth Configuration`  [EXTRACTED]
  .agents/skills/convex-setup-auth/SKILL.md → convex/auth.config.ts
- `Convex Create Component Skill` --conceptually_related_to--> `Convex AI Guidelines`  [INFERRED]
  .agents/skills/convex-create-component/SKILL.md → convex/_generated/ai/guidelines.md
- `Convex Migration Helper Skill` --conceptually_related_to--> `Convex AI Guidelines`  [INFERRED]
  .agents/skills/convex-migration-helper/SKILL.md → convex/_generated/ai/guidelines.md
- `Graphify Agent Rules` --references--> `Convex AI Guidelines`  [EXTRACTED]
  AGENTS.md → convex/_generated/ai/guidelines.md

## Communities (48 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (38): 1. Push Filters To Storage, 2. Minimize Data Sources, 3. Minimize Row Size, 4. Isolate Frequently-Updated Fields, 5. Match Consistency To Read Patterns, Aggregates, Backfills, Check for redundant indexes (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): Agent Mode, Checklist, code:bash (npm create convex@latest my-app -- -t owner/repo), code:bash (npx convex dev --once), code:tsx (// Bad: re-creates the client on every render), code:tsx (// src/main.tsx), code:tsx (// app/ConvexClientProvider.tsx), code:tsx (// app/layout.tsx) (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (32): 1. Use point-in-time reads when live updates are not valuable, 2. Batch related data into fewer queries, 3. Use skip to avoid unnecessary subscriptions, 4. Isolate frequently-updated fields into separate documents, 5. Use the aggregate component for counts and sums, 6. Narrow query read sets, 7. Remove `Date.now()` from queries, 8. Consider pagination strategy (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (30): 1. Bound your reads, 2. Read smaller shapes, 3. Break large mutations into batches, 4. Move heavy work to actions, 5. Trim return values, 6. Replace `ctx.runQuery` and `ctx.runMutation` with helper functions, 7. Avoid unnecessary `runAction` calls, code:ts (// Bad: unbounded read, breaks as the table grows) (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): Cancel a Running Migration, Check Migration Status, code:bash (npx convex run migrations:runIt '{"dryRun": true}'), code:bash (npx convex run --component migrations lib:getStatus --watch), code:bash (npx convex run --component migrations lib:cancel '{"name": "), code:typescript (await migrations.cancel(ctx, internal.migrations.addDefaultR), code:bash (npx convex deploy --cmd 'npm run build' && npx convex run mi), code:typescript (export const migrateHeavyTable = migrations.define({) (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (27): dependencies, @clerk/nextjs, @clerk/react, convex, next, react, react-dom, svix (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (13): http, svixId, svixSignature, svixTimestamp, wh, addNumber, listNumbers, myAction (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (23): Advanced Patterns, Authentication and environment access, Client-facing API, code:ts (// Bad: parent app table IDs are not valid component validat), code:ts (// Good: treat parent-owned IDs as strings at the boundary), code:ts (// Bad: component code cannot rely on app auth or env), code:ts (// Good: the app resolves auth and env, then passes explicit), code:ts (// Bad: assuming a component function is directly callable b) (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): 1. Reduce read set size, 2. Split hot documents, 3. Move non-critical work to scheduled functions, 4. Combine competing writes, Broad read sets causing false conflicts, code:ts (// Bad: broad scan creates a wide conflict surface), code:ts (// Good: indexed query touches only relevant documents), code:ts (// Bad: every vote increments the same counter document) (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (20): Adding Index, Adding New Table, Adding Optional Field, Breaking Changes: The Deployment Workflow, code:typescript (// Before), code:typescript (posts: defineTable({), code:typescript (users: defineTable({), Common Migration Patterns (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (43): Graphify Agent Rules, Claude Graphify Rules, Convex Auth Configuration, Convex Create Component Skill, Convex AI Guidelines, Convex Migration Helper Skill, Convex Performance Audit Skill, Convex Quickstart Skill (+35 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): Adding a Required Field, Changing a Field Type, Cleaning Up Orphaned Documents, code:typescript (// Deploy 1: Schema allows both states), code:typescript (import { query } from "./_generated/server";), code:bash (npx convex run --component migrations lib:getStatus --watch), code:typescript (// Deploy 1: Make optional), code:typescript (// Deploy 1: Add new field, keep old field optional) (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (20): Action guidelines, Authentication guidelines, code:ts (import { cronJobs } from "convex/server";), code:typescript (/// <reference types="vite/client" />), code:block12 (import { query } from "./_generated/server";), code:typescript (export default {), code:tsx (import { ConvexProviderWithAuth, ConvexReactClient } from "c), code:ts (import { query } from "./_generated/server";) (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (19): code:typescript (import { httpRouter } from "convex/server";), code:typescript (import { mutation } from "./_generated/server";), code:typescript (import { defineSchema, defineTable } from "convex/server";), code:block4 (export const f = query({), code:ts (import { v } from "convex/values";), Function calling, Function guidelines, Function references (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (16): compilerOptions, allowJs, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (15): 1. Scope the problem, 2. Trace the full read and write set, 3. Apply fixes from the relevant reference, 4. Fix sibling functions together, 5. Verify before finishing, Checklist, Convex Performance Audit, Escalate Larger Fixes (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (16): Checklist, Choose the Shape, code:ts (// convex/components/notifications/convex.config.ts), code:ts (// convex/components/notifications/schema.ts), code:ts (// convex/components/notifications/lib.ts), code:ts (// convex/convex.config.ts), code:ts (// convex/notifications.ts  (app-side wrapper)), Component Skeleton (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): After Choosing a Provider, Checklist, code:ts (// Bad: trusting a client-provided userId), code:ts (// Good: verifying identity server-side), Convex Authentication Setup, Core Pattern: Protecting Backend Functions, First Step: Choose the Auth Provider, Provider References (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (10): Auth0, Checklist, Concrete Steps, Files and Env Vars To Expect, Gotchas, Key Setup Areas, Production, Validation (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (10): Checklist, Clerk, Concrete Steps, Files and Env Vars To Expect, Gotchas, Key Setup Areas, Production, Validation (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (11): Checklist, Concrete Steps, Convex Auth, Expected Files and Decisions, Gotchas, Human Handoff, Production, Validation (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (10): Checklist, Concrete Steps, Files and Env Vars To Expect, Gotchas, Key Setup Areas, Production, Validation, What To Do (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): Build Flow, Checklist, Default Approach, Package Exports, Packaged Convex Components, Testing, When to Choose This

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (4): geistMono, geistSans, metadata, convex

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): Checklist, code:text (convex/), Default Layout, Local Convex Components, When to Choose This, Workflow Notes

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (6): code:block1 (npm install), code:block2 (npm create convex@latest -- -t nextjs-clerk), Get started, Join the community, Learn more, Welcome to your Convex + Next.js + Clerk app

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (5): code:bash (npx convex ai-files install), Convex, Route to the Right Skill, Start Here, When Not to Use

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): ActionCtx, DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (5): Checklist, Default Advice, Hybrid Convex Components, Risks, What This Means

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (4): agentSkillsSha, agentsMdSectionHash, claudeMdHash, guidelinesHash

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): code:ts (// convex/myFunctions.ts), code:ts (const data = useQuery(api.myFunctions.myQueryFunction, {), code:ts (// convex/myFunctions.ts), code:ts (const mutation = useMutation(api.myFunctions.myMutationFunct), Welcome to your Convex functions directory!

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (4): DataModel, Doc, Id, TableNames

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (3): dependencies, @kilocode/plugin, @opencode-ai/plugin

## Knowledge Gaps
- **399 isolated node(s):** `version`, `source`, `sourceType`, `skillPath`, `computedHash` (+394 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Convex Quickstart` connect `Community 1` to `Community 14`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Writing Your First Function` connect `Community 14` to `Community 1`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `version`, `source`, `sourceType` to the rest of the system?**
  _400 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05226480836236934 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._