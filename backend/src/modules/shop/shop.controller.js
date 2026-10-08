import Business from "../businesses/business.model.js";
import Product from "../products/product.model.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeWebsite = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};

export const getShopListings = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 48);
    const search = String(req.query.search || "").trim().slice(0, 100);
    const category = String(req.query.category || "").trim().slice(0, 80);

    const businesses = await Business.find({ status: "active", shopEnabled: true })
      .select("_id name logo shopDescription phone supportPhone website")
      .lean();
    const businessById = new Map(businesses.map((business) => [String(business._id), business]));

    if (!businesses.length) {
      return res.json({ products: [], categories: [], pagination: { currentPage: page, totalPages: 0, totalProducts: 0 } });
    }

    const filter = {
      business: { $in: businesses.map((business) => business._id) },
      publishedToShop: true
    };
    if (category) filter.category = category;
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: expression }, { category: expression }];
    }

    const [totalProducts, products, categoryProducts] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("_id name category price stock business")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.find({
        business: { $in: businesses.map((business) => business._id) },
        publishedToShop: true
      }).distinct("category")
    ]);

    const publicProducts = products.map((product) => {
      const business = businessById.get(String(product.business));
      return {
        id: String(product._id),
        name: product.name,
        category: product.category || "General",
        price: Number(product.price) || 0,
        available: Number(product.stock) > 0,
        business: {
          name: business.name,
          logo: business.logo || "",
          description: business.shopDescription || "",
          phone: business.supportPhone || business.phone || "",
          website: safeWebsite(business.website || "")
        }
      };
    });

    return res.json({
      products: publicProducts,
      categories: categoryProducts.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts
      }
    });
  } catch (error) {
    console.error("GET SHOP LISTINGS ERROR:", error);
    return res.status(500).json({ message: "Could not load shop listings." });
  }
};
