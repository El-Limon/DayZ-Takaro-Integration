// IronZone Quest Fix - DayZ-Expansion group quest fixes.
//
// For a group quest, ExpansionQuest stores the group OWNER's UID in m_PlayerUID.
// Expansion's code repeatedly resolves m_Player = PlayerBase.GetPlayerByUID(m_PlayerUID)
// and bails when that is NULL (owner offline). This strands group quests:
//   - CreateQuestInstance crashes on accept (NULL GetPlayer().GetPosition())
//   - OnQuestObjectivesComplete returns before SetQuestState(CAN_TURNIN)
//     => objectives all complete but quest never becomes turn-in-able
//   - OnQuestTurnIn returns false => quest cannot be handed in
//
// Fix: whenever the stored owner UID points at an offline player, repoint it at
// an online group member. Whoever is interacting with the quest is online and is
// in m_PlayerUIDs, so a valid player is always available.

modded class ExpansionQuest
{
	override PlayerBase GetPlayer()
	{
		PlayerBase player = super.GetPlayer();
		if (player)
			return player;

		foreach (string memberUID : m_PlayerUIDs)
		{
			PlayerBase member = PlayerBase.GetPlayerByUID(memberUID);
			if (member)
				return member;
		}

		return null;
	}

	void IronZone_EnsureOnlineOwner()
	{
		if (PlayerBase.GetPlayerByUID(m_PlayerUID))
			return;

		foreach (string memberUID : m_PlayerUIDs)
		{
			PlayerBase member = PlayerBase.GetPlayerByUID(memberUID);
			if (member && member.GetIdentity())
			{
				m_PlayerUID = memberUID;
				return;
			}
		}
	}

	override void OnQuestObjectivesComplete()
	{
		IronZone_EnsureOnlineOwner();
		super.OnQuestObjectivesComplete();
	}

	override bool OnQuestTurnIn(string playerUID, ExpansionQuestRewardConfig reward = null, int selectedObjItemIndex = -1)
	{
		IronZone_EnsureOnlineOwner();
		return super.OnQuestTurnIn(playerUID, reward, selectedObjItemIndex);
	}
}
