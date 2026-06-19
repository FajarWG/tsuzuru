```markdown
# tsuzuru Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and workflows used in the `tsuzuru` repository — a TypeScript codebase built with Next.js 16, React 19, and Prisma 7. You'll learn how to structure features, integrate UI libraries, evolve the database schema, enforce security patterns, and write tests. This guide also provides step-by-step instructions and command shortcuts for common development tasks.

## Architecture

The project follows a strict **layered architecture**:

```
Server Actions (lib/actions/*.ts)
    ↓  auth check via session
Services (services/*.ts)
    ↓  business logic & ownership enforcement
Repositories (repositories/*.ts)
    ↓  Prisma queries, always scoped by userId
Database (PostgreSQL via Prisma + @prisma/adapter-pg)
```

- **`lib/actions/`** — Next.js Server Actions. Always call `auth()` and validate session first.
- **`services/`** — Business logic. Responsible for ownership checks (e.g., `bill.userId !== userId → throw`).
- **`repositories/`** — Raw Prisma queries. Always scope queries with `userId` to prevent cross-user data access.
- **`lib/`** — Shared utilities (e.g., `seedBudgetLimits.ts`, `prisma.ts`, `db-init.ts`).

## Security Rules (CRITICAL)

These rules prevent cross-user data leakage. Always follow them when writing or modifying Server Actions and Services:

1. **Every Server Action must call `auth()` first** and return `{ success: false, error: "Unauthorized" }` if no session exists.
2. **Never accept `userId` as a parameter from the client**. Always derive it from `session.user.id` on the server.
   ```typescript
   // ❌ Wrong — userId from client can be spoofed
   export async function deleteAction(id: string, userId: string) { ... }

   // ✅ Correct — always from session
   export async function deleteAction(id: string) {
     const session = await auth();
     if (!session?.user?.id) return { success: false, error: "Unauthorized" };
     // use session.user.id
   }
   ```
3. **All repository queries must be scoped by `userId`**. Use `findFirst({ where: { id, userId } })` instead of `findUnique({ where: { id } })` for user-owned resources.
4. **Services must verify ownership** before mutating records (e.g., check `record.userId === userId` before update/delete).
5. **Never log sensitive user data** (email, name, tokens, DB user objects) via `console.log`. Use minimal error-only logs.
6. **AI rate limiting is per-user** and stored in `UserSettings.aiLimitUntil`. Never use filesystem-based state.

## Coding Conventions

**File Naming**
- Use `camelCase` for file names.
  - Example: `userProfile.tsx`, `accountActions.ts`

**Import Style**
- Use import aliases for cleaner and more maintainable code.
  - Example:
    ```typescript
    import Button from '@/components/ui/button'
    import { fetchAccounts } from '@/lib/actions/accounts'
    ```

**Export Style**
- Default exports are preferred.
  - Example:
    ```typescript
    // components/dashboard/AccountList.tsx
    export default function AccountList(props) {
      // ...
    }
    ```

**Component Structure**
- Place shared or reusable components under `components/`.
- UI-specific components often go under `components/ui/`.
- Page components are located in `app/(app)/*/page.tsx`.

**Backend Logic**
- Place backend actions and logic in `lib/actions/`.
- Database schema and seeding logic are managed under `prisma/`.
- Shared pure utilities go in `lib/` (e.g., `lib/seedBudgetLimits.ts`).

**Language & Localization**
- Always use English for all user-facing labels, titles, descriptions, placeholders, and interactive options.
- Maintain consistency by ensuring error messages, logs, and database schema annotations are in English.

## Shared Utilities

### `lib/seedBudgetLimits.ts`
Single source of truth for seeding default budget limits (monthly, pocket_money, shopping) for a user. Used by `dashboardService`, `budgetService`, and `settingsService`. Do not duplicate this logic.

```typescript
import { seedBudgetLimitsIfEmpty } from '@/lib/seedBudgetLimits'
const limits = await seedBudgetLimitsIfEmpty(userId)
```

### Split Bill — `splitGroupId` Field
The `Transaction` model has a `splitGroupId String?` field that links adjustment transactions to their source bill settlement. New code must populate this field instead of embedding `[tx_id:...]` magic strings in the `description` field.

The query in `getPaginatedTransactionsAction` supports both: it checks `splitGroupId` first and falls back to the legacy regex for backward compat.

## Workflows

### Feature Development with Shared UI and Actions
**Trigger:** When adding a new feature or major enhancement that spans frontend pages, shared UI, and backend logic.
**Command:** `/new-feature`

1. Create or update one or more `app/(app)/*/page.tsx` files for new or enhanced pages.
2. Update or add components in `components/`.
3. Update or add **Server Actions** in `lib/actions/*.ts` — always include `auth()` check.
4. Update or add **Services** in `services/*.ts` — always include ownership check.
5. Update or add **Repositories** in `repositories/*.ts` — always scope queries by `userId`.
6. Update shared files like `app/layout.tsx` or `app/(app)/layout.tsx` as needed.
7. Update `package.json` if new dependencies are required.
8. Optionally update Prisma schema (`prisma/schema.prisma`) and run `prisma db push`.
9. **Write tests** in `__tests__/` for new service logic and actions.

### Prisma Schema and Seed Evolution
**Trigger:** When adding or modifying database tables, relationships, or initial data.
**Command:** `/new-table`

1. Edit `prisma/schema.prisma` to define or update models.
2. Run `node node_modules/prisma/build/index.js db push` to apply to DB (npx is blocked by PowerShell execution policy — use node directly).
3. Update or add `lib/actions/*.ts` and `services/*.ts` to reflect new schema.
4. Update `package.json` scripts if Prisma generation steps change.
5. Optionally update `lib/prisma.ts` or `lib/db-init.ts` if connection logic changes.

**Example:**
```prisma
// prisma/schema.prisma
model Transaction {
  id           String   @id @default(cuid())
  userId       String
  splitGroupId String?  // links to source bill settlement
  // ...
}
```

### UI Library Integration and Enhancement
**Trigger:** When integrating a new UI library or enhancing UI/UX with new components.
**Command:** `/add-ui-library`

1. Install the library (`bun add <package>`).
2. Create new components in `components/ui/` or similar directories.
3. Update relevant page and layout files.

## Testing Patterns

- **Framework**: [Vitest](https://vitest.dev/) v4
- **Config**: `vitest.config.ts` at project root
- **Location**: `__tests__/` directory, mirroring `services/` and `lib/actions/` structure
- **Commands**:
  ```bash
  bun run test          # run all tests once
  bun run test:watch    # watch mode
  bun run test:coverage # with coverage report
  ```

All tests use `vi.mock()` to mock Prisma repositories — no real database connection needed.

**Example (service test):**
```typescript
// __tests__/services/billFriendService.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/repositories/billFriendRepository', () => ({
  billFriendRepository: { findById: vi.fn(), ... }
}))

describe('settleBill', () => {
  it('throws when bill belongs to a different user', async () => {
    mockBillRepo.findById.mockResolvedValue({ userId: 'user-2' })
    await expect(billFriendService.settleBill('bill-1', 'user-1'))
      .rejects.toThrow('Bill not found')
  })
})
```

**Example (action test — auth enforcement):**
```typescript
// __tests__/lib/actions/settings.test.ts
vi.mock('@/auth', () => ({ auth: vi.fn() }))

it('returns Unauthorized without session', async () => {
  mockAuth.mockResolvedValue(null)
  const result = await updateUserSettingsAction({ ... })
  expect(result).toMatchObject({ success: false, error: 'Unauthorized' })
})
```

## Commands

| Command          | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| /new-feature     | Start a new feature spanning pages, UI, and backend            |
| /add-ui-library  | Integrate or enhance with a new UI library/component           |
| /new-table       | Add or modify database schema and seed data                    |
| `bun run test`   | Run Vitest test suite                                          |
| `bun run dev`    | Start development server                                       |
```
