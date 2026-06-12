---
name: feature-development-with-shared-ui-and-actions
description: Workflow command scaffold for feature-development-with-shared-ui-and-actions in tsuzuru.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-shared-ui-and-actions

Use this workflow when working on **feature-development-with-shared-ui-and-actions** in `tsuzuru`.

## Goal

Implements a new feature or major enhancement by updating multiple app pages, shared UI components, and related backend action files.

## Common Files

- `app/(app)/*/page.tsx`
- `components/*/*.tsx`
- `lib/actions/*.ts`
- `app/layout.tsx`
- `app/(app)/layout.tsx`
- `package.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update one or more app/(app)/*/page.tsx files for new or enhanced pages.
- Update or add components in components/ (often dashboard, templates, transactions, or settings related).
- Update or add backend logic in lib/actions/*.ts (such as accounts, templates, transactions).
- Update shared files like app/layout.tsx, app/(app)/layout.tsx, or app/page.tsx as needed.
- Update package.json and package-lock.json if dependencies or scripts are required.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.