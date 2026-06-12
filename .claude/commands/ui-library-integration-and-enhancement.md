---
name: ui-library-integration-and-enhancement
description: Workflow command scaffold for ui-library-integration-and-enhancement in tsuzuru.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /ui-library-integration-and-enhancement

Use this workflow when working on **ui-library-integration-and-enhancement** in `tsuzuru`.

## Goal

Integrates a new UI library or enhances the UI experience by adding new UI components and updating relevant pages and layouts.

## Common Files

- `package.json`
- `package-lock.json`
- `components/ui/*.tsx`
- `app/(app)/*/page.tsx`
- `app/layout.tsx`
- `components/layout/*.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Install new UI library and update package.json and package-lock.json.
- Create new components in components/ui/ or similar directories.
- Update relevant app/(app)/*/page.tsx and app/layout.tsx files to use new UI components.
- Optionally update shared layout or provider files (e.g., LoadingProvider, LoadingScreen).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.