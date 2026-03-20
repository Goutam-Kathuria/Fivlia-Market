const Earning = require("../modals/earning");

const normalizeTransactionId = (value) => String(value || "").trim();

const normalizeAmount = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const recordBannerEarning = async ({
  transactionId,
  userId,
  bannerId,
  selectedPlan,
} = {}) => {
  try {
    const normalizedTransactionId = normalizeTransactionId(transactionId);
    if (!normalizedTransactionId) return null;

    const amount = normalizeAmount(selectedPlan?.price);

    return await Earning.create({
      sourceType: "banner",
      amount,
      transactionId: normalizedTransactionId,
      userId,
      referenceModel: "Banner",
      referenceId: bannerId,
      meta: {
        planType: selectedPlan?.type ?? null,
        selectedPlanId: selectedPlan?._id ?? null,
      },
    });
  } catch (error) {
    if (error?.code !== 11000) {
      console.error("Failed to record banner earning:", error);
    }
    return null;
  }
};

const attachBannerEarnings = async (banners = []) => {
  const transactionIds = [
    ...new Set(
      banners
        .map((item) => normalizeTransactionId(item?.transactionId))
        .filter(Boolean),
    ),
  ];

  const earningsByTransactionId = new Map();

  if (transactionIds.length) {
    const earnings = await Earning.find({
      sourceType: "banner",
      transactionId: { $in: transactionIds },
    })
      .select("transactionId amount status")
      .lean();

    for (const entry of earnings) {
      earningsByTransactionId.set(entry.transactionId, entry);
    }
  }

  return banners.map((item) => {
    const transactionId = normalizeTransactionId(item?.transactionId);
    const earning = transactionId ? earningsByTransactionId.get(transactionId) : null;
    const fallbackAmount = normalizeAmount(item?.selectedPlanId?.price);

    return {
      ...item,
      earningAmount: earning?.amount ?? fallbackAmount,
      earningStatus: earning?.status ?? null,
    };
  });
};

module.exports = {
  recordBannerEarning,
  attachBannerEarnings,
};

