import { useState } from "react";

const initialState = {
  name: "",
  email: "",
  password: "",
  permissions: {
    canMakeSale: true,
    canOverridePrice: false,
    canViewReports: false
  }
};

const StaffForm = ({ onCreate }) => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    await onCreate(form);
    setForm(initialState);
    setLoading(false);
  };

  return (
    <form className="tool-panel flex flex-col gap-4" onSubmit={handleSubmit}>
      
      <div className="panel-heading">
        <div>
          <h2>Add Staff</h2>
          <p>Create new staff and assign permissions</p>
        </div>
      </div>

      {/* INPUTS */}
      <div className="flex flex-col gap-3">
        <input
          className="input-field"
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={handleChange}
        />

        <input
          className="input-field"
          name="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
        />

        <input
          className="input-field"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      {/* PERMISSIONS */}
      <div className="flex flex-col gap-3 mt-2">
        <p className="text-sm font-medium text-gray-600">Permissions</p>

        <label className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
          <span>Can make sale</span>
          <input
            type="checkbox"
            checked={form.permissions.canMakeSale}
            onChange={() => togglePermission("canMakeSale")}
          />
        </label>

        <label className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
          <span>Override price</span>
          <input
            type="checkbox"
            checked={form.permissions.canOverridePrice}
            onChange={() => togglePermission("canOverridePrice")}
          />
        </label>

        <label className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
          <span>View reports</span>
          <input
            type="checkbox"
            checked={form.permissions.canViewReports}
            onChange={() => togglePermission("canViewReports")}
          />
        </label>
      </div>

      {/* BUTTON */}
      <button
        className="primary-button mt-3"
        type="submit"
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Staff"}
      </button>
    </form>
  );
};

export default StaffForm;