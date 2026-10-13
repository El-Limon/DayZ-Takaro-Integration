class CfgPatches
{
	class IronZoneQuestFix
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] =
		{
			"DZ_Data",
			"DayZExpansion_Quests_Scripts"
		};
	};
};

class CfgMods
{
	class IronZoneQuestFix
	{
		dir = "IronZoneQuestFix";
		hideName = 0;
		hidePicture = 1;
		name = "IronZone Quest Fix";
		credits = "";
		author = "IronZone";
		version = "1.0";
		extra = 0;
		type = "mod";
		dependencies[] = {"World"};
		class defs
		{
			class worldScriptModule
			{
				value = "";
				files[] = {"IronZoneQuestFix/Scripts/4_World"};
			};
		};
	};
};
