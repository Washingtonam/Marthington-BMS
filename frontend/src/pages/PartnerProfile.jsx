import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAffiliateProfile, updateAffiliateProfile } from "../api/affiliates.js";

const PartnerProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success' or 'error'
  
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    bankName: "",
    accountNumber: "",
    accountName: ""
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setMessage("");
      
      console.log("Fetching profile...");
      const data = await getAffiliateProfile();
      
      console.log("Profile data received:", data);
      
      if (data.affiliate) {
        setFormData({
          phone: data.affiliate.phone || "",
          address: data.affiliate.address || "",
          bankName: data.affiliate.paymentDetails?.bankName || "",
          accountNumber: data.affiliate.paymentDetails?.accountNumber || "",
          accountName: data.affiliate.paymentDetails?.accountName || ""
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setMessage(err.message || "Failed to load profile");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (messageType === "success") {
      const timer = setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [messageType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!formData.phone || !formData.address || !formData.bankName || !formData.accountNumber || !formData.accountName) {
      setMessage("All fields are required");
      setMessageType("error");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      
      console.log("Updating profile with data:", formData);
      
      const response = await updateAffiliateProfile({
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        accountName: formData.accountName.trim()
      });

      console.log("Profile update response:", response);

      setMessage(response.message || "Profile updated successfully");
      setMessageType("success");
    } catch (err) {
      console.error("Profile update error:", err);
      setMessage(err.message || "Failed to update profile");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-slate-300">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/partners/dashboard")}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-slate-400">Manage your account details and payment information</p>
        </div>

        {/* Alert Messages */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              messageType === "success"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
                : "bg-rose-500/15 text-rose-300 border border-rose-400/20"
            }`}
          >
            {message}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          
          {/* User Info Section */}
          <div className="mb-8 pb-8 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-white font-medium">{user?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white font-medium">{user?.email || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+234 (0) 000 0000"
                    className="w-full rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your complete residential address"
                    rows="3"
                    className="w-full rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Bank Details</h3>
              <p className="text-sm text-slate-400 mb-4">This information is used for payout processing</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="e.g., Zenith Bank, GTBank, Access Bank"
                    className="w-full rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter 10-digit account number"
                    className="w-full rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Account Name</label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Name on the bank account"
                    className="w-full rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => navigate("/partners/dashboard")}
                className="flex-1 rounded-lg px-4 py-3 border border-slate-600 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg px-4 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-8 p-4 rounded-lg bg-slate-700/20 border border-slate-600/50">
          <p className="text-sm text-slate-400">
            ✓ Your bank details are encrypted and used only for payout processing. We never share your information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PartnerProfile;
