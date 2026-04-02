# Bug: NG8102 warnings for redundant nullish coalescing in content-library

## Summary

Angular compiler emits 4 NG8102 warnings in `content-library.ts` because `transcodingProgress[id] ?? 0` uses `??` on a type that TypeScript considers non-nullable (`Record<string, number>` indexed access returns `number`, not `number | undefined`).

## Steps to Reproduce

1. Run the frontend dev server (`ng serve` or `docker-compose up`)
2. Observe 4 NG8102 warnings in the build output referencing `content-library.ts` lines 179, 186, 275, 277

## Expected Behavior

Clean build with no warnings.

## Root Cause

`transcodingProgress` is typed as `Record<string, number>` at `src/app/content/content-library.ts:926`. When accessed with a string key in the template, TypeScript infers the return type as `number` (not `number | undefined`), making the `?? 0` fallback redundant from the type checker's perspective.

The intent is correct — at runtime, accessing a missing key returns `undefined` — but the type doesn't model this. The fix is either:
- Change the type to `Record<string, number | undefined>` (accurate) or `{ [key: string]: number | undefined }` — then `??` is justified
- Or keep `Record<string, number>` and remove the `?? 0` (suppresses warnings but loses the safety net)

The first option is better because it makes the type match reality.

## User Stories

### BUG-002-001: Fix transcodingProgress type to eliminate NG8102 warnings

**Description:** As a developer, I want a clean build output so that real warnings aren't buried in noise.

**Acceptance Criteria:**
- [x] Change `transcodingProgress` type at line 926 to `Record<string, number | undefined>` (or equivalent)
- [x] All 4 NG8102 warnings on lines 179, 186, 275, 277 are resolved
- [x] No regression in transcoding progress display
- [x] `npm run build` (frontend) produces no new warnings
