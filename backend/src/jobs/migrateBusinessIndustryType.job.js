import Business from "../modules/businesses/business.model.js";

const runBusinessIndustryMigration = async () => {
  try {
    const query = {
      $or: [
        { industryType: { $exists: false } },
        { industryType: "" },
        { industryType: null }
      ]
    };

    const businesses = await Business.find(query).lean();

    if (!businesses.length) {
      console.log("No businesses required industryType migration.");
      return;
    }

    for (const business of businesses) {
      const shouldBePro =
        business.isPro === true ||
        (business.subscription?.plan === "pro" &&
          business.subscription?.status === "active");

      const updateFields = {
        industryType: "retail",
        isPro: shouldBePro
      };

      await Business.collection.updateOne(
        { _id: business._id },
        { $set: updateFields }
      );

      console.log(`Fixed business: ${business.name}`);
    }

    console.log(
      `Business industryType migration complete. ${businesses.length} businesses fixed.`
    );
  } catch (err) {
    console.error(
      "Business industryType migration failed:",
      err.message
    );
  }
};

export default runBusinessIndustryMigration;
