modded class HypeTrain_PartBase
{
    protected void EnsureClientSimulation()
    {
        if (g_Game.IsDedicatedServer())
            return;

        SetRequiredSimulation(true);
        SetEventMask(EntityEvent.SIMULATE);
        CreateDynamicPhysics(PhxInteractionLayers.DYNAMICITEM);
        EnableDynamicCCD(true);
        SetDynamicPhysicsLifeTime(14400);

        Physics phys = GetPhysics();
        if (phys)
            phys.SetActive(ActiveState.ALWAYS_ACTIVE);
    }

    void HypeTrain_PartBase()
    {
        EnsureClientSimulation();
    }

    override void EEInit()
    {
        super.EEInit();
        EnsureClientSimulation();
    }

    override void OnVariablesSynchronized()
    {
        super.OnVariablesSynchronized();
        EnsureClientSimulation();
    }
}
