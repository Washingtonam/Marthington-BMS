import { useState } from "react";

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

          <label className="flex justify-between bg-gray-50 p-3 rounded-md">
            <span>Can make sale</span>
            <input
              type="checkbox"
              checked={permissions.canMakeSale}
              onChange={() => toggle("canMakeSale")}
            />
          </label>

          <label className="flex justify-between bg-gray-50 p-3 rounded-md">
            <span>Override price</span>
            <input
              type="checkbox"
              checked={permissions.canOverridePrice}
              onChange={() => toggle("canOverridePrice")}
            />
          </label>

          <label className="flex justify-between bg-gray-50 p-3 rounded-md">
            <span>View reports</span>
            <input
              type="checkbox"
              checked={permissions.canViewReports}
              onChange={() => toggle("canViewReports")}
            />
          </label>

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