# Bug: ScreenProtocolService fails NestJS DI — ScreenStateService unresolvable at index [3]

## Summary

The backend crashes on startup with `UndefinedDependencyException`: NestJS cannot resolve `ScreenStateService` (constructor index [3]) for `ScreenProtocolService`. The app does not start.

## Related

- **Commit:** e08da1e9 (feat(screen-protocol): add group-aware SSE state & sync events — TASK-012-005)

## Steps to Reproduce

1. Run `docker-compose up` (or `npm run start:dev` in the backend)
2. Observe crash: `Nest can't resolve dependencies of the ScreenProtocolService (ScreenGroupRepository, ScreenRepository, SlicedRenditionRepository, ?, ScheduleService)`

## Expected Behavior

The backend starts successfully with all dependencies resolved.

## Root Cause

`ScreenProtocolService` is provided directly in `ScreenModule` at `src/screen/screen.module.ts:20`, but the NestJS module wiring doesn't properly resolve its 4th constructor parameter (`ScreenStateService`).

The constructor at `src/screen-protocol/screen-protocol.service.ts:26-35`:

```typescript
constructor(
  @InjectRepository(ScreenGroup) private readonly screenGroupRepository: Repository<ScreenGroup>,   // [0]
  @InjectRepository(Screen) private readonly screenRepository: Repository<Screen>,                   // [1]
  @InjectRepository(SlicedRendition) private readonly slicedRenditionRepository: Repository<SlicedRendition>, // [2]
  private readonly screenStateService: ScreenStateService,   // [3] ← FAILS HERE
  private readonly scheduleService: ScheduleService,         // [4]
) {}
```

`ScreenModule` at `src/screen/screen.module.ts:20` lists both `ScreenStateService` and `ScreenProtocolService` as providers, and imports `TypeOrmModule.forFeature([Screen, ScreenGroup, SlicedRendition])` plus `ScheduleEntryModule`. All dependencies *should* be available.

The issue is likely one of:

1. **Provider ordering / circular reference**: `ScreenProtocolService` depends on `ScreenStateService`, which also lives in the same module. NestJS resolves providers in declaration order — if `ScreenStateService` depends on something from `ScreenProtocolModule` (which is also imported), a circular resolution may cause index [3] to be undefined at injection time.

2. **`ScreenProtocolModule` not exporting what `ScreenProtocolService` needs**: The `ScreenProtocolModule` at `src/screen-protocol/screen-protocol.module.ts` only provides `SCREEN_PROTOCOL_ADAPTER` (the `JsonProtocolAdapter`). `ScreenProtocolService` itself is registered in `ScreenModule`, not its own module — this split registration pattern is fragile and can cause resolution failures when the injector tries to wire dependencies across module boundaries.

3. **Missing `forwardRef`**: If there's a circular dependency between `ScreenModule` and another module providing `ScheduleService`, NestJS may fail to resolve intermediate providers like `ScreenStateService`.

## User Stories

### BUG-001-001: Fix ScreenProtocolService dependency injection wiring

**Description:** As a developer, I want the backend to start without DI errors so that the screen protocol service functions correctly.

**Acceptance Criteria:**
- [x] `ScreenProtocolService` constructor parameter at index [3] (`ScreenStateService`) resolves correctly
- [x] Either move `ScreenProtocolService` into `ScreenProtocolModule` with proper imports (TypeOrmModule.forFeature, ScreenStateService), or fix the provider wiring in `ScreenModule`
- [x] If circular dependencies exist, resolve them with `forwardRef()` or restructure modules
- [x] Backend starts without `UndefinedDependencyException`
- [x] No regression in screen state tracking or SSE event delivery
- [x] `go vet ./...` equivalent: `npm run build` passes without errors
- [x] `go test ./...` equivalent: `npm run test` passes
