# HypeTrain Sound Fix

DayZ 1.29 regression fix for [HypeTrain](https://steamcommunity.com/sharedfiles/filedetails/?id=3115714092) by Arkensor. After 1.29, House-based entities (which `HypeTrain_PartBase` inherits from) stopped receiving `EOnSimulate` ticks, freezing the per-tick `UpdateSoundVariables` that drives the engine RPM crossfade. Startup/stop one-shots still play; the looping engine sound while running goes silent.

## Fix

`modded class HypeTrain_PartBase` forces the client entity to keep simulating:

- `SetRequiredSimulation(true)`
- `SetEventMask(EntityEvent.SIMULATE)`
- `CreateDynamicPhysics(PhxInteractionLayers.DYNAMICITEM)`
- `EnableDynamicCCD(true)`
- `SetDynamicPhysicsLifeTime(14400)`
- `GetPhysics().SetActive(ActiveState.ALWAYS_ACTIVE)`

Called from the constructor, `EEInit`, and `OnVariablesSynchronized`. Gated on `!g_Game.IsDedicatedServer()` so it's a no-op server-side.

## Credits

- **Arkensor** — original HypeTrain mod
- **Juze** — diagnosed the EOnSimulate regression and posted both fix approaches in Arkensor's Discord
- **liquidrock** — flagged that `dBody*` is obsolete since 1.29, recommended `GetPhysics()`; suggested dropping `IsClientContext()` for `!g_Game.IsDedicatedServer()`
- **Wardog** — recommended `SetRequiredSimulation` as the canonical API; Arkensor concurred
- Packaged by **mad-001**

## Usage

Requires HypeTrain. Load alongside it on both client and server.
