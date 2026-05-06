import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import request from "../api/client.js";

import {
  getServices
} from "../api/services.js";

import {
  formatCurrency
} from "../utils/formatters.js";

import {
  useAuth
} from "../context/AuthContext.jsx";

const POS = () => {

  const navigate = useNavigate();

  const { user, business } = useAuth();

  // ====================================
  // STATE
  // ====================================

  const [products, setProducts] =
    useState([]);

  const [services, setServices] =
    useState([]);

  const [cart, setCart] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [upgradeMsg, setUpgradeMsg] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("products");

  // 🔥 PRODUCT LIMIT IN POS
  const [visibleProducts, setVisibleProducts] =
    useState(10);

  // CUSTOMER
  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [autoSend, setAutoSend] =
    useState(false);

  // MANUAL SERVICE
  const [serviceForm, setServiceForm] =
    useState({
      name: "",
      price: ""
    });

  const isPro =
    business?.subscription?.status ===
    "active";

  const canOverride =
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.permissions?.canOverridePrice;

  // ====================================
  // LOAD DATA
  // ====================================

  useEffect(() => {

    const load = async () => {

      try {

        setLoading(true);

        const [
          productData,
          serviceData
        ] = await Promise.all([

          // 🔥 LIMITED INITIAL LOAD
          request(
            "/products?page=1&limit=100"
          ),

          getServices({
            activeOnly: true
          })

        ]);

        // 🔥 PAGINATION SAFE
        const safeProducts =
          Array.isArray(productData)
            ? productData
            : productData.products || [];

        setProducts(safeProducts);

        // 🔥 SERVICE SAFE
        const safeServices =
          Array.isArray(serviceData)
            ? serviceData
            : serviceData.services || [];

        setServices(
          safeServices.filter(
            (s) =>
              s.isActive !== false
          )
        );

      } catch (err) {

        setError(
          err.message ||
          "Failed to load POS"
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  // ====================================
  // FILTERS
  // ====================================

  const filteredProducts =
    useMemo(() => {

      return products
        .filter((p) => {

          const keyword =
            search.toLowerCase();

          return (
            p.name
              ?.toLowerCase()
              .includes(keyword) ||

            p.sku
              ?.toLowerCase()
              .includes(keyword) ||

            p.category
              ?.toLowerCase()
              .includes(keyword)
          );
        })

        .slice(0, visibleProducts);

    }, [
      products,
      search,
      visibleProducts
    ]);

  const filteredServices =
    useMemo(() => {

      return services.filter((s) => {

        const keyword =
          search.toLowerCase();

        return (
          s.name
            ?.toLowerCase()
            .includes(keyword) ||

          s.category
            ?.toLowerCase()
            .includes(keyword)
        );
      });

    }, [services, search]);

  // ====================================
  // ADD PRODUCT
  // ====================================

  const addProduct = (product) => {

    setCart((current) => {

      const existing =
        current.find(
          (i) =>
            i._id === product._id &&
            i.itemType === "product"
        );

      if (existing) {

        return current.map((i) =>
          i._id === product._id
            ? {
                ...i,
                quantity:
                  i.quantity + 1
              }
            : i
        );
      }

      return [
        ...current,
        {
          ...product,

          itemType: "product",

          quantity: 1,

          sellingPrice:
            Number(
              product.sellingPrice ||
              product.price ||
              0
            )
        }
      ];
    });
  };

  // ====================================
  // ADD SAVED SERVICE
  // ====================================

  const addSavedService = (
    service
  ) => {

    setCart((current) => {

      const existing =
        current.find(
          (i) =>
            i.serviceId ===
              service._id &&
            i.itemType ===
              "service"
        );

      if (existing) {

        return current.map((i) =>
          i.serviceId ===
            service._id
            ? {
                ...i,
                quantity:
                  i.quantity + 1
              }
            : i
        );
      }

      return [
        ...current,
        {
          _id:
            "service-" +
            service._id,

          itemType:
            "service",

          serviceId:
            service._id,

          name:
            service.name,

          quantity: 1,

          sellingPrice:
            Number(
              service.price || 0
            )
        }
      ];
    });
  };

  // ====================================
  // ADD MANUAL SERVICE
  // ====================================

  const addManualService = () => {

    if (
      !serviceForm.name ||
      !serviceForm.price
    ) {
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        _id:
          "manual-service-" +
          Date.now(),

        itemType: "service",

        name:
          serviceForm.name,

        quantity: 1,

        sellingPrice:
          Number(
            serviceForm.price
          )
      }
    ]);

    setServiceForm({
      name: "",
      price: ""
    });
  };

  // ====================================
  // QTY
  // ====================================

  const updateQty = (
    id,
    qty
  ) => {

    if (qty <= 0) {

      setCart((c) =>
        c.filter(
          (i) => i._id !== id
        )
      );

      return;
    }

    setCart((c) =>
      c.map((i) =>
        i._id === id
          ? {
              ...i,
              quantity: qty
            }
          : i
      )
    );
  };

  // ====================================
  // PRICE
  // ====================================

  const updatePrice = (
    id,
    price
  ) => {

    setCart((c) =>
      c.map((i) =>
        i._id === id
          ? {
              ...i,
              sellingPrice:
                Number(price) || 0
            }
          : i
      )
    );
  };

  // ====================================
  // TOTAL
  // ====================================

  const total = useMemo(() => {

    return cart.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          item.sellingPrice,
      0
    );

  }, [cart]);

  // ====================================
  // FORMAT PHONE
  // ====================================

  const formatPhone = (
    phone
  ) => {

    if (!phone) return "";

    let p =
      phone.replace(/\D/g, "");

    if (p.startsWith("0")) {

      p =
        "234" +
        p.slice(1);
    }

    return p;
  };

  // ====================================
  // CHECKOUT
  // ====================================

  const checkout = async () => {

    if (
      !cart.length ||
      processing
    ) return;

    try {

      setProcessing(true);

      setUpgradeMsg("");

      const payload = {

        customerName,

        customerPhone,

        notes,

        autoSend,

        items: cart.map(
          (i) => {

            if (
              i.itemType ===
              "product"
            ) {

              return {

                itemType:
                  "product",

                product: i._id,

                quantity:
                  i.quantity,

                sellingPrice:
                  i.sellingPrice
              };
            }

            return {

              itemType:
                "service",

              name:
                i.name,

              quantity:
                i.quantity,

              sellingPrice:
                i.sellingPrice
            };
          }
        )
      };

      const res =
        await request(
          "/sales",
          {
            method: "POST",

            body:
              JSON.stringify(
                payload
              )
          }
        );

      const sale =
        res?.sale;

      setCart([]);

      setCustomerName("");

      setCustomerPhone("");

      setNotes("");

      if (sale?._id) {

        const receiptLink =
          `${window.location.origin}/r/${sale.receiptId}`;

        if (
          autoSend &&
          customerPhone &&
          isPro
        ) {

          const phone =
            formatPhone(
              customerPhone
            );

          const message =
            `🧾 ${business?.name}

Hello ${
  customerName ||
  "Customer"
},

Thank you for your purchase.

Amount:
${formatCurrency(total)}

View Receipt:
${receiptLink}

Powered by Marthington`;

          window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
            "_blank"
          );
        }

        navigate(
          `/app/sales/${sale._id}`
        );
      }

    } catch (err) {

      setUpgradeMsg(
        err.message ||
        "Checkout failed"
      );

    } finally {

      setProcessing(false);

    }
  };

  return (

    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* LEFT */}

      <div className="space-y-5">

        {/* SEARCH */}

        <div className="tool-panel">

          <input
            type="text"

            placeholder="Search products/services..."

            value={search}

            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }

            className="w-full border rounded-xl p-3"
          />

        </div>

        {/* TABS */}

        <div className="flex gap-3">

          <button
            onClick={() =>
              setActiveTab(
                "products"
              )
            }

            className={`px-4 py-2 rounded-xl ${
              activeTab ===
              "products"
                ? "bg-black text-white"
                : "border"
            }`}
          >
            Products
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "services"
              )
            }

            className={`px-4 py-2 rounded-xl ${
              activeTab ===
              "services"
                ? "bg-black text-white"
                : "border"
            }`}
          >
            Services
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* PRODUCTS */}

        {activeTab ===
          "products" && (

          <div className="tool-panel">

            <div className="compact-list">

              {loading && (
                <div className="empty-state">
                  Loading...
                </div>
              )}

              {!loading &&
                filteredProducts.length === 0 && (
                <div className="empty-state">
                  No products found
                </div>
              )}

              {filteredProducts.map((p) => (

                <div
                  key={p._id}

                  onClick={() =>
                    addProduct(p)
                  }

                  className="compact-row cursor-pointer hover:bg-gray-50 transition"
                >

                  <div>

                    <strong>
                      {p.name}
                    </strong>

                    <div className="text-xs text-gray-500">
                      {
                        p.category ||
                        "General"
                      }
                    </div>

                  </div>

                  <div className="text-right">

                    <div>
                      {
                        formatCurrency(
                          p.sellingPrice ||
                          p.price
                        )
                      }
                    </div>

                    <div className="text-xs text-gray-500">
                      Stock:
                      {" "}
                      {p.stock}
                    </div>

                  </div>

                </div>
              ))}

            </div>

            {/* LOAD MORE */}

            {filteredProducts.length >=
              visibleProducts && (

              <button
                onClick={() =>
                  setVisibleProducts(
                    (prev) =>
                      prev + 10
                  )
                }

                className="w-full mt-4 border rounded-xl p-3 hover:bg-gray-50"
              >
                Load More Products
              </button>

            )}

          </div>
        )}

        {/* SERVICES */}

        {activeTab ===
          "services" && (

          <div className="space-y-5">

            <div className="tool-panel">

              <div className="panel-heading">
                <h2>
                  Saved Services
                </h2>
              </div>

              <div className="compact-list">

                {filteredServices.map((s) => (

                  <div
                    key={s._id}

                    onClick={() =>
                      addSavedService(
                        s
                      )
                    }

                    className="compact-row cursor-pointer hover:bg-gray-50 transition"
                  >

                    <div>

                      <strong>
                        {s.name}
                      </strong>

                      <div className="text-xs text-gray-500">
                        {
                          s.category ||
                          "General"
                        }
                      </div>

                    </div>

                    <strong>
                      {
                        formatCurrency(
                          s.price
                        )
                      }
                    </strong>

                  </div>
                ))}

              </div>

            </div>

            {/* QUICK SERVICE */}

            <div className="tool-panel">

              <div className="panel-heading">
                <h2>
                  Quick Service
                </h2>
              </div>

              <div className="grid gap-3">

                <input
                  type="text"

                  placeholder="Service name"

                  value={
                    serviceForm.name
                  }

                  onChange={(e) =>
                    setServiceForm(
                      (prev) => ({
                        ...prev,
                        name:
                          e.target.value
                      })
                    )
                  }

                  className="border rounded-xl p-3"
                />

                <input
                  type="number"

                  placeholder="Service price"

                  value={
                    serviceForm.price
                  }

                  onChange={(e) =>
                    setServiceForm(
                      (prev) => ({
                        ...prev,
                        price:
                          e.target.value
                      })
                    )
                  }

                  className="border rounded-xl p-3"
                />

                <button
                  onClick={
                    addManualService
                  }

                  className="bg-black text-white p-3 rounded-xl"
                >
                  Add Service
                </button>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* RIGHT */}

      <div className="tool-panel">

        <div className="panel-heading">
          <h2>Cart</h2>
        </div>

        <div className="compact-list">

          {!cart.length && (
            <div className="empty-state">
              No items
            </div>
          )}

          {cart.map((item) => (

            <div
              key={item._id}

              className="border rounded-2xl p-4 mb-3"
            >

              <div className="flex justify-between">

                <div>

                  <strong>
                    {item.name}
                  </strong>

                  <div className="text-xs text-gray-500 mt-1">

                    {item.itemType}

                  </div>

                </div>

                <strong>

                  {
                    formatCurrency(
                      item.quantity *
                        item.sellingPrice
                    )
                  }

                </strong>

              </div>

              <div className="flex gap-3 items-center mt-3">

                <button
                  onClick={() =>
                    updateQty(
                      item._id,
                      item.quantity - 1
                    )
                  }
                >
                  -
                </button>

                <span>
                  {item.quantity}
                </span>

                <button
                  onClick={() =>
                    updateQty(
                      item._id,
                      item.quantity + 1
                    )
                  }
                >
                  +
                </button>

              </div>

              <div className="mt-3">

                {canOverride ? (

                  <input
                    type="number"

                    value={
                      item.sellingPrice
                    }

                    onChange={(e) =>
                      updatePrice(
                        item._id,
                        e.target.value
                      )
                    }

                    className="w-full border rounded-xl p-2"
                  />

                ) : (

                  <span>
                    {
                      formatCurrency(
                        item.sellingPrice
                      )
                    }
                  </span>

                )}

              </div>

            </div>
          ))}

        </div>

        {/* CUSTOMER */}

        <div className="space-y-3 mt-5">

          <input
            type="text"

            placeholder="Customer name"

            value={customerName}

            onChange={(e) =>
              setCustomerName(
                e.target.value
              )
            }

            className="w-full border rounded-xl p-3"
          />

          <input
            type="text"

            placeholder="Customer phone"

            value={customerPhone}

            onChange={(e) =>
              setCustomerPhone(
                e.target.value
              )
            }

            className="w-full border rounded-xl p-3"
          />

          <textarea
            placeholder="Notes"

            value={notes}

            onChange={(e) =>
              setNotes(
                e.target.value
              )
            }

            className="w-full border rounded-xl p-3"
          />

        </div>

        {/* WHATSAPP */}

        <div className="mt-4">

          <label className="flex gap-2 items-center text-sm">

            <input
              type="checkbox"

              checked={autoSend}

              disabled={!isPro}

              onChange={() =>
                setAutoSend(
                  !autoSend
                )
              }
            />

            Auto send receipt via WhatsApp

          </label>

        </div>

        {/* ERROR */}

        {upgradeMsg && (

          <div className="bg-red-100 text-red-700 px-3 py-2 rounded-xl mt-4 text-sm">

            {upgradeMsg}

          </div>

        )}

        {/* TOTAL */}

        <div className="mt-6 border-t pt-4 flex justify-between text-xl font-bold">

          <span>Total</span>

          <span>
            {formatCurrency(total)}
          </span>

        </div>

        {/* CHECKOUT */}

        <button
          onClick={checkout}

          disabled={
            !cart.length ||
            processing
          }

          className="w-full mt-5 bg-blue-600 text-white p-4 rounded-2xl"
        >

          {processing
            ? "Processing..."
            : "Complete Sale"}

        </button>

      </div>

    </section>
  );
};

export default POS;