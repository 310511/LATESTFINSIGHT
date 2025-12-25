import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  LayoutGrid,
  Upload,
  History,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Bell,
  Shield,
  Mail,
  Globe,
  Moon,
  Sun,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../firebase/useAuth";
import { logOut } from "../firebase/auth";
import { userAPI } from "../services/api";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [preferredExportFormat, setPreferredExportFormat] = useState("excel");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Fetch user settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const response = await userAPI.getSettings(currentUser.uid);

        if (response.success && response.settings) {
          setEmailNotifications(response.settings.email_notifications ?? true);
          setPushNotifications(response.settings.push_notifications ?? true);
          setDarkMode(response.settings.dark_mode ?? false);
          setPreferredExportFormat(response.settings.preferred_export_format || "excel");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        // Use defaults if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // Set display name from Firebase user
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser]);

  const handleLogout = async () => {
    const result = await logOut();
    if (result.success) {
      navigate("/");
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid) {
      setSaveError("You must be logged in to save settings");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess(false);

      const response = await userAPI.updateSettings(currentUser.uid, {
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        dark_mode: darkMode,
        preferred_export_format: preferredExportFormat,
      });

      if (response.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setSaveError(response.error || "Failed to save settings. Please try again.");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveError(error.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F8FAFC] via-blue-50/20 to-purple-50/20 font-sans">
      {/* ------------------ SIDEBAR ------------------ */}
      <aside className="w-[260px] bg-[#FFFFFF] border-r border-[#E5E7EB]/80 flex flex-col justify-between shadow-premium">
        <div>
          <div className="flex items-center px-5 py-5 border-b border-[#E5E7EB]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 border border-blue-100/50">
              <img src={logo} alt="" className="w-7 h-7" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent ml-3">FinSight</span>
          </div>

          <nav className="mt-6 px-3 space-y-1.5">
            <SidebarLink 
              icon={<LayoutGrid className="w-5 h-5" />} 
              label="Dashboard" 
              onClick={() => navigate("/dashboard")}
            />
            <SidebarLink 
              icon={<Upload className="w-5 h-5" />} 
              label="Upload Document" 
              onClick={() => navigate("/dashboard/upload")}
            />
            <SidebarLink 
              icon={<History className="w-5 h-5" />} 
              label="History" 
              onClick={() => navigate("/dashboard/history")}
            />
            <SidebarLink 
              icon={<HelpCircle className="w-5 h-5" />} 
              label="Support" 
              onClick={() => navigate("/dashboard/support")}
            />
            <SidebarLink 
              icon={<Settings className="w-5 h-5" />} 
              label="Settings" 
              active
              onClick={() => navigate("/dashboard/settings")}
            />
          </nav>
        </div>

        <div className="p-4 border-t border-[#E5E7EB]">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 text-[#475569] hover:text-red-600 hover:bg-red-50/50 rounded-xl transition-all duration-200 font-medium"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ------------------ MAIN CONTENT ------------------ */}
      <main className="flex-1 flex flex-col bg-gradient-to-br from-[#F8FAFC] via-blue-50/20 to-purple-50/20">
        {/* ---------- TOP BAR ---------- */}
        <header className="flex items-center justify-between bg-white/80 backdrop-blur-xl px-6 py-4 shadow-sm border-b border-[#E5E7EB]/50">
          <h1 className="text-lg font-semibold text-[#0F172A] tracking-[-0.01em]">
            Settings
          </h1>
        </header>

        {/* ---------- SETTINGS CONTENT ---------- */}
        <div className="flex-1 overflow-y-auto flex flex-col px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Profile Settings */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Profile Settings</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 tracking-[-0.01em]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all duration-200"
                    placeholder="Enter your name"
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    Note: Display name changes are managed through Firebase Auth
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 tracking-[-0.01em]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue={currentUser?.email || ""}
                    disabled
                    className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl bg-[#F8FAFC] text-[#64748B]"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Notifications</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-[#0F172A]">Email Notifications</label>
                    <p className="text-xs text-[#64748B] mt-1">Receive email updates about your documents</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1E40AF]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-[#0F172A]">Push Notifications</label>
                    <p className="text-xs text-[#64748B] mt-1">Get real-time notifications in your browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => setPushNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1E40AF]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                {darkMode ? <Moon className="w-6 h-6 text-[#1E40AF]" /> : <Sun className="w-6 h-6 text-[#1E40AF]" />}
                <h2 className="text-lg font-semibold text-[#0F172A]">Appearance</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-[#0F172A]">Dark Mode</label>
                  <p className="text-xs text-[#64748B] mt-1">Switch to dark theme</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1E40AF]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Security</h2>
              </div>
              <div className="space-y-4">
                <button className="w-full text-left px-4 py-3 border-2 border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFC] hover:border-[#1E40AF]/30 transition-all duration-200">
                  <div className="font-semibold text-[#0F172A]">Change Password</div>
                  <div className="text-xs text-[#64748B] mt-1">Update your account password</div>
                </button>
                <button className="w-full text-left px-4 py-3 border-2 border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFC] hover:border-[#1E40AF]/30 transition-all duration-200">
                  <div className="font-semibold text-[#0F172A]">Two-Factor Authentication</div>
                  <div className="text-xs text-[#64748B] mt-1">Add an extra layer of security</div>
                </button>
              </div>
            </div>

            {/* Export Format Settings */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Export Preferences</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 tracking-[-0.01em]">
                    Preferred Export Format
                  </label>
                  <select
                    value={preferredExportFormat}
                    onChange={(e) => setPreferredExportFormat(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all duration-200"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button and Status */}
            <div className="flex flex-col items-end gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Settings saved successfully!
                </div>
              )}
              {saveError && (
                <div className="text-red-600 text-sm">{saveError}</div>
              )}
              <button
                onClick={handleSave}
                disabled={loading || saving}
                className="flex items-center gap-2 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#1E3A8A] hover:to-[#7C3AED] shadow-[0_4px_12px_rgba(30,64,175,0.3)] hover:shadow-[0_6px_16px_rgba(30,64,175,0.4)] transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Sidebar Link Component ---
const SidebarLink = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-left group ${
      active 
        ? "text-[#2563EB] bg-[#EFF6FF]/60" 
        : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
    }`}
  >
    {/* Subtle active indicator */}
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2563EB] rounded-r-full"></div>
    )}
    <span className={`flex-shrink-0 mr-3 transition-colors duration-200 ${
      active ? 'text-[#2563EB]' : 'text-[#94A3B8] group-hover:text-[#475569]'
    }`}>
      {icon}
    </span>
    <span className="flex-1">{label}</span>
  </button>
);

export default SettingsPage;


