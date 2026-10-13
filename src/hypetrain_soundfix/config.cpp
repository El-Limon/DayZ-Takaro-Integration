class CfgPatches
{
    class HypeTrainSoundFix
    {
        units[] = {};
        weapons[] = {};
        requiredVersion = 0.1;
        requiredAddons[] = {"DZ_Data", "DZ_Scripts", "HypeTrain_Core"};
    };
};

class CfgMods
{
    class HypeTrainSoundFix
    {
        type = "mod";
        dir = "HypeTrainSoundFix";
        name = "HypeTrain Sound Fix";
        credits = "Juze (diagnosis), liquidrock + Wardog (refinements), bundled by mad-001";
        author = "mad-001";
        authorID = "0";
        version = "1.0.0";
        extra = 0;
        dependencies[] = {"World"};

        class defs
        {
            class worldScriptModule
            {
                value = "";
                files[] = {"HypeTrainSoundFix/scripts/4_World"};
            };
        };
    };
};
