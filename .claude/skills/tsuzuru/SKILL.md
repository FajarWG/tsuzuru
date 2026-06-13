```markdown
# tsuzuru Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and workflows used in the `tsuzuru` repository—a TypeScript codebase built with Next.js. You'll learn how to structure features, integrate UI libraries, evolve the database schema, and follow the project's conventions for file naming, imports, exports, and testing. This guide also provides step-by-step instructions and command shortcuts for common development tasks.

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

**Language & Localization**
- Always use English for all user-facing labels, titles, descriptions, placeholders, and interactive options.
- Maintain consistency by ensuring error messages, logs, and database schema annotations are in English.

## Workflows

### Feature Development with Shared UI and Actions
**Trigger:** When adding a new feature or major enhancement that spans frontend pages, shared UI, and backend logic.  
**Command:** `/new-feature`

1. Create or update one or more `app/(app)/*/page.tsx` files for new or enhanced pages.
2. Update or add components in `components/` (e.g., dashboard, templates, transactions, settings).
3. Update or add backend logic in `lib/actions/*.ts` (such as accounts, templates, transactions).
4. Update shared files like `app/layout.tsx`, `app/(app)/layout.tsx`, or `app/page.tsx` as needed.
5. Update `package.json` and `package-lock.json` if dependencies or scripts are required.
6. Optionally, update or add Prisma schema and seed files if data model changes are needed.

**Example:**
```typescript
// app/(app)/accounts/page.tsx
import AccountList from '@/components/dashboard/AccountList'
import { fetchAccounts } from '@/lib/actions/accounts'

export default async function AccountsPage() {
  const accounts = await fetchAccounts()
  return <AccountList accounts={accounts} />
}
```

### UI Library Integration and Enhancement
**Trigger:** When integrating a new UI library (e.g., framer-motion, Sonner) or enhancing UI/UX with new components.  
**Command:** `/add-ui-library`

1. Install the new UI library and update `package.json` and `package-lock.json`.
2. Create new components in `components/ui/` or similar directories.
3. Update relevant `app/(app)/*/page.tsx` and `app/layout.tsx` files to use the new UI components.
4. Optionally update shared layout or provider files (e.g., `LoadingProvider`, `LoadingScreen`).

**Example:**
```typescript
// components/ui/AnimatedButton.tsx
import { motion } from 'framer-motion'

export default function AnimatedButton({ children, ...props }) {
  return (
    <motion.button whileHover={{ scale: 1.1 }} {...props}>
      {children}
    </motion.button>
  )
}
```

### Prisma Schema and Seed Evolution
**Trigger:** When adding or modifying database tables, relationships, or initial data.  
**Command:** `/new-table`

1. Edit `prisma/schema.prisma` to define or update models.
2. Update `prisma/seed.ts` to seed new or changed data.
3. Update or add `lib/actions/*.ts` to reflect new schema in backend logic.
4. Update `package.json` scripts if Prisma generation or migration steps change.
5. Optionally update `lib/prisma.ts` or `lib/db-init.ts` if connection logic changes.

**Example:**
```prisma
// prisma/schema.prisma
model Transaction {
  id        String   @id @default(uuid())
  amount    Int
  createdAt DateTime @default(now())
  // ...
}
```
```typescript
// lib/actions/transactions.ts
import prisma from '@/lib/prisma'

export async function createTransaction(data) {
  return prisma.transaction.create({ data })
}
```

## Testing Patterns

- Test files follow the pattern `*.test.*` (e.g., `accountActions.test.ts`).
- The testing framework is currently unknown; check for configuration in the project root or `package.json`.
- Place tests alongside the files they cover or in a dedicated `__tests__` directory.

**Example:**
```typescript
// lib/actions/accountActions.test.ts
import { fetchAccounts } from './accountActions'

test('fetchAccounts returns an array', async () => {
  const accounts = await fetchAccounts()
  expect(Array.isArray(accounts)).toBe(true)
})
```

## Commands

| Command         | Purpose                                                 |
|-----------------|---------------------------------------------------------|
| /new-feature    | Start a new feature spanning pages, UI, and backend     |
| /add-ui-library | Integrate or enhance with a new UI library/component    |
| /new-table      | Add or modify database schema and seed data             |
```
