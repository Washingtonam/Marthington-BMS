import {
  useEffect,
  useState
} from "react";

import request from "../api/client.js";

const initialForm = {

  name: "",

  email: "",

  password: "",

  role: "staff",

  permissions: {

    canManageProducts: false,

    canViewProducts: true,

    canMakeSale: true,

    canViewSales: true,

    canViewReports: false,

    canOverridePrice: false,

    canManageStaff: false,

    canManageSettings: false
  }
};

const Staff = () => {

  const [staff, setStaff] =
    useState([]);

  const [form, setForm] =
    useState(initialForm);

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================
  // LOAD STAFF
  // =====================================

  useEffect(() => {

    const load = async () => {

      try {

        const data =
          await request(
            "/staff"
          );

        setStaff(data);

      } catch (err) {

        setError(
          err.message
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  // =====================================
  // CHANGE
  // =====================================

  const handleChange = (
    e
  ) => {

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
  // PERMISSIONS
  // =====================================

  const togglePermission = (
    permission
  ) => {

    setForm((prev) => ({
      ...prev,

      permissions: {
        ...prev.permissions,

        [permission]:
          !prev.permissions[
            permission
          ]
      }
    }));
  };

  // =====================================
  // SUBMIT
  // =====================================

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault();

    setError("");

    try {

      setSaving(true);

      // CREATE
      if (!editingId) {

        const res =
          await request(
            "/staff",
            {
              method: "POST",

              body:
                JSON.stringify(
                  form
                )
            }
          );

        setStaff((prev) => [
          res.user,
          ...prev
        ]);

      } else {

        const res =
          await request(
            `/staff/${editingId}`,
            {
              method: "PUT",

              body:
                JSON.stringify(
                  form
                )
            }
          );

        setStaff((prev) =>
          prev.map((u) =>
            u._id === editingId
              ? res.user
              : u
          )
        );

        setEditingId(null);
      }

      setForm(initialForm);

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setSaving(false);

    }
  };

  // =====================================
  // EDIT
  // =====================================

  const handleEdit = (
    user
  ) => {

    setEditingId(user._id);

    setForm({

      name:
        user.name || "",

      email:
        user.email || "",

      password: "",

      role:
        user.role || "staff",

      permissions:
        user.permissions ||
        initialForm.permissions
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
        "Delete staff?"
      );

    if (!confirmed) return;

    try {

      await request(
        `/staff/${id}`,
        {
          method: "DELETE"
        }
      );

      setStaff((prev) =>
        prev.filter(
          (u) =>
            u._id !== id
        )
      );

    } catch (err) {

      alert(
        err.message
      );

    }
  };

  return (

    <section className="products-layout">

      {/* STAFF LIST */}

      <div>

        <div className="page-heading">

          <div>

            <span>
              Team Management
            </span>

            <h1>
              Staff
            </h1>

          </div>

        </div>

        <div className="product-table mt-4">

          <div className="product-row product-row-head">

            <span>Name</span>

            <span>Role</span>

            <span>Status</span>

            <span>Actions</span>

          </div>

          {loading && (
            <div className="empty-state">
              Loading...
            </div>
          )}

          {!loading &&
            !staff.length && (
            <div className="empty-state">
              No staff yet
            </div>
          )}

          {staff.map((user) => (

            <div
              key={user._id}
              className="product-row"
            >

              <span>

                <div className="font-semibold">
                  {user.name}
                </div>

                <div className="text-xs text-gray-400">
                  {user.email}
                </div>

              </span>

              <span>
                {user.role}
              </span>

              <span>

                {user.isActive ? (

                  <span className="text-green-600">
                    Active
                  </span>

                ) : (

                  <span className="text-red-500">
                    Disabled
                  </span>

                )}

              </span>

              <span className="flex gap-2">

                <button
                  onClick={() =>
                    handleEdit(
                      user
                    )
                  }

                  className="text-blue-600 text-sm"
                >

                  Edit

                </button>

                <button
                  onClick={() =>
                    handleDelete(
                      user._id
                    )
                  }

                  className="text-red-500 text-sm"
                >

                  Delete

                </button>

              </span>

            </div>
          ))}

        </div>

      </div>

      {/* FORM */}

      <div className="tool-panel">

        <h2 className="font-bold text-lg">

          {editingId
            ? "Edit Staff"
            : "Add Staff"}

        </h2>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-3"
        >

          <label>

            Full Name

            <input
              name="name"

              value={form.name}

              onChange={
                handleChange
              }

              required
            />

          </label>

          <label>

            Email

            <input
              name="email"

              type="email"

              value={form.email}

              onChange={
                handleChange
              }

              required

              disabled={
                editingId
              }
            />

          </label>

          {!editingId && (

            <label>

              Password

              <input
                name="password"

                type="password"

                value={
                  form.password
                }

                onChange={
                  handleChange
                }

                required
              />

            </label>

          )}

          <label>

            Role

            <select
              name="role"

              value={form.role}

              onChange={
                handleChange
              }
            >

              <option value="staff">
                Staff
              </option>

              <option value="cashier">
                Cashier
              </option>

              <option value="manager">
                Manager
              </option>

            </select>

          </label>

          {/* PERMISSIONS */}

          <div className="border rounded-xl p-4">

            <h3 className="font-semibold mb-3">
              Permissions
            </h3>

            <div className="grid gap-2">

              {Object.keys(
                form.permissions
              ).map((permission) => (

                <label
                  key={permission}
                  className="flex items-center gap-2 text-sm"
                >

                  <input
                    type="checkbox"

                    checked={
                      form
                        .permissions[
                        permission
                      ]
                    }

                    onChange={() =>
                      togglePermission(
                        permission
                      )
                    }
                  />

                  {permission}

                </label>
              ))}

            </div>

          </div>

          <button
            type="submit"

            disabled={saving}

            className="primary-button"
          >

            {saving
              ? "Saving..."
              : editingId
              ? "Update Staff"
              : "Create Staff"}

          </button>

        </form>

      </div>

    </section>
  );
};

export default Staff;