import { useEffect, useMemo, useState } from "react";

import {
  createService,
  deleteService,
  getServices,
  toggleServiceStatus,
  updateService
} from "../api/services.js";

import {
  formatCurrency
} from "../utils/formatters.js";

const defaultForm = {
  name: "",
  category: "General",
  price: "",
  costPrice: "",
  duration: "",
  code: "",
  description: ""
};

const Services = () => {

  const [services, setServices] =
    useState([]);

  // Defensive wrapper: ensure services is always an array
  const servicesList = Array.isArray(services)
    ? services
    : (services?.data || []);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [editingId, setEditingId] =
    useState(null);

  const [form, setForm] =
    useState(defaultForm);

  // =====================================
  // LOAD SERVICES
  // =====================================

  const loadServices = async () => {

    try {

      setLoading(true);

      const data =
        await getServices();

      setServices(data || []);

    } catch (err) {

      setError(
        err.message ||
        "Failed to load services"
      );

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {

    loadServices();

  }, []);

  // =====================================
  // FILTERS
  // =====================================

  const categories = useMemo(() => {

    const all =
      servicesList.map(
        (s) => s.category
      );

    return [
      "All",
      ...new Set(all)
    ];

  }, [services]);

  const filteredServices = useMemo(() => {

    return servicesList.filter(
      (service) => {

        const matchSearch =
          service.name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const matchCategory =
          selectedCategory ===
            "All" ||
          service.category ===
            selectedCategory;

        return (
          matchSearch &&
          matchCategory
        );
      }
    );

  }, [
    services,
    search,
    selectedCategory
  ]);

  // =====================================
  // FORM
  // =====================================

  const handleChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // =====================================
  // SAVE
  // =====================================

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault();

    try {

      setSaving(true);

      setError("");

      const payload = {

        name: form.name,

        category:
          form.category,

        price:
          Number(
            form.price
          ) || 0,

        costPrice:
          Number(
            form.costPrice
          ) || 0,

        duration:
          Number(
            form.duration
          ) || 0,

        code:
          form.code,

        description:
          form.description
      };

      if (editingId) {

        await updateService(
          editingId,
          payload
        );

      } else {

        await createService(
          payload
        );
      }

      // RESET
      setForm(defaultForm);

      setEditingId(null);

      await loadServices();

    } catch (err) {

      setError(
        err.message ||
        "Failed to save service"
      );

    } finally {

      setSaving(false);

    }
  };

  // =====================================
  // EDIT
  // =====================================

  const handleEdit = (
    service
  ) => {

    setEditingId(
      service._id
    );

    setForm({

      name:
        service.name || "",

      category:
        service.category ||
        "General",

      price:
        service.price || "",

      costPrice:
        service.costPrice ||
        "",

      duration:
        service.duration ||
        "",

      code:
        service.code || "",

      description:
        service.description ||
        ""
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // =====================================
  // DELETE
  // =====================================

  const handleDelete = async (
    id
  ) => {

    const confirmed =
      window.confirm(
        "Delete this service?"
      );

    if (!confirmed) return;

    try {

      await deleteService(id);

      await loadServices();

    } catch (err) {

      alert(
        err.message ||
        "Delete failed"
      );
    }
  };

  // =====================================
  // TOGGLE
  // =====================================

  const handleToggle =
    async (id) => {

      try {

        await toggleServiceStatus(
          id
        );

        await loadServices();

      } catch (err) {

        alert(
          err.message ||
          "Failed to update"
        );
      }
    };

  return (

    <section className="page-stack">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <span>
            Service Management
          </span>

          <h1>
            Services
          </h1>

        </div>

        <div className="flex gap-2 flex-wrap">

          <input
            type="text"

            placeholder="Search services..."

            value={search}

            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }

            className="border rounded-md px-3 py-2"
          />

        </div>

      </div>

      {/* ERROR */}

      {error && (

        <div className="form-error">

          {error}

        </div>

      )}

      {/* MAIN GRID */}

      <div className="products-layout">

        {/* LEFT */}

        <div className="tool-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Service Catalog
              </h2>

              <p>
                Manage reusable business services
              </p>

            </div>

          </div>

          {/* FILTERS */}

          <div className="flex gap-2 flex-wrap mb-4">

            {categories.map(
              (category) => (

                <button
                  key={category}

                  onClick={() =>
                    setSelectedCategory(
                      category
                    )
                  }

                  className={`px-3 py-1 rounded-full text-sm border ${
                    selectedCategory ===
                    category
                      ? "bg-black text-white"
                      : "bg-white"
                  }`}
                >

                  {category}

                </button>
              )
            )}

          </div>

          {/* TABLE */}

          <div className="product-table">

            <div className="product-row product-row-head">

              <span>
                Service
              </span>

              <span>
                Price
              </span>

              <span>
                Status
              </span>

              <span>
                Actions
              </span>

            </div>

            {loading && (

              <div className="empty-state">
                Loading services...
              </div>

            )}

            {!loading &&
              !filteredServices.length && (

              <div className="empty-state">
                No services found
              </div>

            )}

            {filteredServices.map(
              (service) => (

                <div
                  key={service._id}
                  className="product-row"
                >

                  <div>

                    <strong>
                      {service.name}
                    </strong>

                    <div className="text-xs text-gray-500">

                      {service.category}

                    </div>

                  </div>

                  <span>

                    {
                      formatCurrency(
                        service.price
                      )
                    }

                  </span>

                  <span>

                    <span
                      className={`status-pill ${
                        service.isActive
                          ? "success"
                          : "danger"
                      }`}
                    >

                      {service.isActive
                        ? "Active"
                        : "Inactive"}

                    </span>

                  </span>

                  <div className="flex gap-2 flex-wrap">

                    <button
                      className="text-blue-600 text-sm"

                      onClick={() =>
                        handleEdit(
                          service
                        )
                      }
                    >

                      Edit

                    </button>

                    <button
                      className="text-yellow-600 text-sm"

                      onClick={() =>
                        handleToggle(
                          service._id
                        )
                      }
                    >

                      {service.isActive
                        ? "Disable"
                        : "Enable"}

                    </button>

                    <button
                      className="text-red-600 text-sm"

                      onClick={() =>
                        handleDelete(
                          service._id
                        )
                      }
                    >

                      Delete

                    </button>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

        {/* RIGHT */}

        <form
          onSubmit={
            handleSubmit
          }

          className="tool-panel product-form"
        >

          <div className="panel-heading">

            <div>

              <h2>

                {editingId
                  ? "Edit Service"
                  : "Create Service"}

              </h2>

              <p>
                Build reusable services for POS
              </p>

            </div>

          </div>

          {/* FORM */}

          <label>

            Service Name

            <input
              name="name"

              value={form.name}

              onChange={
                handleChange
              }

              placeholder="Service Name"
            />

          </label>

          <div className="form-grid">

            <label>

              Category

              <input
                name="category"

                value={
                  form.category
                }

                onChange={
                  handleChange
                }

                placeholder="Services Type"
              />

            </label>

            <label>

              Service Code

              <input
                name="code"

                value={form.code}

                onChange={
                  handleChange
                }

                placeholder="Service Code (Optional)"
              />

            </label>

          </div>

          <div className="form-grid">

            <label>

              Selling Price

              <input
                type="number"

                name="price"

                value={form.price}

                onChange={
                  handleChange
                }

                placeholder="Service Price"
              />

            </label>

            <label>

              Cost Price

              <input
                type="number"

                name="costPrice"

                value={
                  form.costPrice
                }

                onChange={
                  handleChange
                }

                placeholder="Service Cost"
              />

            </label>

          </div>

          <label>

            Duration (Minutes)

            <input
              type="number"

              name="duration"

              value={
                form.duration
              }

              onChange={
                handleChange
              }

              placeholder="30"
            />

          </label>

          <label>

            Description

            <input
              name="description"

              value={
                form.description
              }

              onChange={
                handleChange
              }

              placeholder="Description..."
            />

          </label>

          <button
            type="submit"

            disabled={saving}

            className="primary-button"
          >

            {saving
              ? "Saving..."
              : editingId
              ? "Update Service"
              : "Create Service"}

          </button>

          {editingId && (

            <button
              type="button"

              onClick={() => {

                setEditingId(
                  null
                );

                setForm(
                  defaultForm
                );
              }}

              className="border rounded-md p-3"
            >

              Cancel Editing

            </button>

          )}

        </form>

      </div>

    </section>
  );
};

export default Services;