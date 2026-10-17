export const defaultCommissionSchedule = {
  directReferralBonus: null,
  cpaActions: [],
  payoutMilestones: []
};

export const commissionActionKey = (name) =>
  String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const getCommissionScheduleItemKey = (item) =>
  commissionActionKey(item?.id || item?.name);

export const getEligibleCommissionMilestones = (confirmedEarnings, milestones = []) =>
  milestones.filter((milestone) =>
    Number(milestone.thresholdAmount) > 0
    && Number(milestone.rewardAmount) > 0
    && Number(confirmedEarnings) >= Number(milestone.thresholdAmount)
  );

const isValidOptionalDescription = (value) =>
  value === undefined || (typeof value === "string" && value.length <= 1000);

export const validateCommissionSchedule = (schedule) => {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    return "commissionSchedule must be an object.";
  }

  const bonus = schedule.directReferralBonus;
  if (bonus !== null && bonus !== undefined && (
    !bonus || typeof bonus !== "object" || Array.isArray(bonus)
    || typeof bonus.amount !== "number" || !Number.isFinite(bonus.amount) || bonus.amount < 0
    || !isValidOptionalDescription(bonus.description)
  )) {
    return "directReferralBonus must be null or an object with a non-negative amount and optional description.";
  }

  if (!Array.isArray(schedule.cpaActions) || schedule.cpaActions.length > 50) {
    return "cpaActions must be a list of no more than 50 items.";
  }
  for (const action of schedule.cpaActions) {
    if (!action || typeof action !== "object" || Array.isArray(action)
      || typeof action.name !== "string" || !action.name.trim() || action.name.length > 120
      || (action.id !== undefined && (typeof action.id !== "string" || !action.id.trim() || action.id.length > 120))
      || typeof action.flatFee !== "number" || !Number.isFinite(action.flatFee) || action.flatFee < 0
      || !isValidOptionalDescription(action.description)
      || (action.active !== undefined && typeof action.active !== "boolean")) {
      return "Each CPA action requires a name, a non-negative flatFee, an optional description, and an optional active flag.";
    }
  }
  const actionKeys = schedule.cpaActions.map(getCommissionScheduleItemKey);
  if (actionKeys.some((key) => !key) || new Set(actionKeys).size !== actionKeys.length) {
    return "CPA action names must be unique and contain at least one letter or number.";
  }

  if (!Array.isArray(schedule.payoutMilestones) || schedule.payoutMilestones.length > 50) {
    return "payoutMilestones must be a list of no more than 50 items.";
  }
  for (const milestone of schedule.payoutMilestones) {
    if (!milestone || typeof milestone !== "object" || Array.isArray(milestone)
      || typeof milestone.name !== "string" || !milestone.name.trim() || milestone.name.length > 120
      || (milestone.id !== undefined && (typeof milestone.id !== "string" || !milestone.id.trim() || milestone.id.length > 120))
      || typeof milestone.thresholdAmount !== "number" || !Number.isFinite(milestone.thresholdAmount) || milestone.thresholdAmount < 0
      || typeof milestone.rewardAmount !== "number" || !Number.isFinite(milestone.rewardAmount) || milestone.rewardAmount < 0
      || !isValidOptionalDescription(milestone.description)) {
      return "Each payout milestone requires a name, non-negative thresholdAmount and rewardAmount, and an optional description.";
    }
  }
  const milestoneKeys = schedule.payoutMilestones.map(getCommissionScheduleItemKey);
  if (milestoneKeys.some((key) => !key) || new Set(milestoneKeys).size !== milestoneKeys.length) {
    return "Payout milestone names must be unique and contain at least one letter or number.";
  }

  return null;
};
