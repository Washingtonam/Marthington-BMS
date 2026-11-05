import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { applyAccentColor, defaultAccentColor } from "../utils/appearance.js";

const BRANDING_STORAGE_KEY = "bms_active_branding_profile";
const BrandingContext = createContext(null);

const cleanString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const readStoredProfile = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY));
    return stored && typeof stored === "object" ? stored : null;
  } catch {
    return null;
  }
};

export const normalizeBrandingProfile = (profile = {}) => ({
  businessName: cleanString(profile.businessName ?? profile.name ?? profile.shopName),
  phone: cleanString(profile.phone ?? profile.phoneNumber),
  email: cleanString(profile.email),
  address: cleanString(profile.address),
  logoUrl: cleanString(profile.logoUrl ?? profile.logo),
  showLogo: profile.showLogo ?? (profile.brandSettings?.showLogo !== false),
  showBusinessAddress: profile.showBusinessAddress ?? (profile.brandSettings?.showBusinessAddress !== false),
  showPhone: profile.showPhone ?? (profile.brandSettings?.showPhone !== false),
  showEmail: profile.showEmail ?? (profile.brandSettings?.showEmail !== false),
  watermarkText: cleanString(profile.watermarkText ?? profile.brandSettings?.watermarkText),
  accentTheme: cleanString(
    profile.accentTheme ??
    profile.primaryColor ??
    profile.brandSettings?.primaryColor
  ) || defaultAccentColor,
});

export const BrandingProvider = ({ children }) => {
  const { business, user } = useAuth();
  const [activeOverride, setActiveOverride] = useState(readStoredProfile);

  const sourceProfile = useMemo(() => {
    if (activeOverride) return activeOverride;
    return {
      businessName: business?.name ?? user?.businessName ?? "",
      phone: business?.phone ?? business?.phoneNumber ?? "",
      email: business?.email ?? user?.email ?? "",
      address: business?.address ?? "",
      logoUrl: business?.logoUrl ?? business?.logo ?? "",
      showLogo: business?.brandSettings?.showLogo !== false,
      showBusinessAddress: business?.brandSettings?.showBusinessAddress !== false,
      showPhone: business?.brandSettings?.showPhone !== false,
      showEmail: business?.brandSettings?.showEmail !== false,
      watermarkText: business?.brandSettings?.watermarkText || "",
      accentTheme:
        business?.accentTheme ??
        business?.brandSettings?.primaryColor ??
        user?.appearance?.accentColor ??
        defaultAccentColor,
    };
  }, [activeOverride, business, user]);

  const brandingProfile = useMemo(
    () => normalizeBrandingProfile(sourceProfile),
    [sourceProfile]
  );

  useEffect(() => {
    applyAccentColor(brandingProfile.accentTheme);
  }, [brandingProfile.accentTheme]);

  const activateProfile = (profile) => {
    const normalized = normalizeBrandingProfile(profile);
    setActiveOverride(normalized);
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalized));
  };

  const updateProfile = (updates) => {
    activateProfile({ ...brandingProfile, ...(updates ?? {}) });
  };

  const resetProfile = () => {
    setActiveOverride(null);
    localStorage.removeItem(BRANDING_STORAGE_KEY);
  };

  const value = useMemo(() => ({
    ...brandingProfile,
    brandingProfile,
    activateProfile,
    updateProfile,
    resetProfile,
  }), [brandingProfile]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context) return context;
  return normalizeBrandingProfile({});
};
