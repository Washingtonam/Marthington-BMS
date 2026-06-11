import { useState } from "react";

const permissionLabels = {
  canViewDashboard: {
    label: "View dashboard",
    description: "Allow access to the main business dashboard overview."
  },
  canManageProducts: {
    label: "Manage products & services",
    description: "Create, edit, and delete products or services."
  },
  canViewProducts: {
    label: "View products & services",
    description: "See products and services inside the POS catalog."
  },
  canMakeSale: {
    label: "Create sales",
    description: "Process sales and complete checkout in POS."
  },
  canViewSales: {
    label: "View sales records",
    description: "Access invoices, orders, and sales history."
  },
  canViewReports: {
    label: "View reports",
    description: "Open analytics, revenue, and profit reports."
  },
  canOverridePrice: {
    label: "Override prices",
    description: "Allow price adjustments during checkout."
  },
  canManageStaff: {
    label: "Manage staff",
    description: "Create and edit staff accounts."
  },
  canManageSettings: {
    label: "Manage settings",
    description: "Change business settings, billing, and integrations."
  }
};

const EditStaffModal = ({ staff, onClose, onSave }) => {
  const [permissions, setPermissions] = useState(staff.permissions || {});

  const toggle = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(staff._id, { permissions });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">

        <div className="mb-4">
          <h2 className="text-lg font-semibold">Edit Permissions</h2>
          <p className="text-sm text-gray-500">{staff.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {Object.keys(permissionLabels).map((permission) => {
            const meta = permissionLabels[permission];

            return (
              <label key={permission} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-gray-700">{meta.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(permissions[permission])}
                    onChange={() => toggle(permission)}
                  />
                </div>
                <small className="text-xs text-gray-500">{meta.description}</small>
              </label>
            );
          })}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button className="primary-button" type="submit">
              Save
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditStaffModal;