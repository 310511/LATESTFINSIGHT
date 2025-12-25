import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  LayoutGrid,
  Upload,
  History,
  Settings,
  HelpCircle,
  LogOut,
  MessageCircle,
  Mail,
  Book,
  Video,
  Send,
  Search,
  ChevronRight,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../firebase/useAuth";
import { logOut } from "../firebase/auth";
import { supportAPI } from "../services/api";

const SupportPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleLogout = async () => {
    const result = await logOut();
    if (result.success) {
      navigate("/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      setSubmitError("Please enter a subject");
      return;
    }
    
    if (!message.trim()) {
      setSubmitError("Please enter a message");
      return;
    }

    if (!currentUser?.uid) {
      setSubmitError("You must be logged in to submit a support ticket");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      
      const response = await supportAPI.createTicket({
        subject: subject.trim(),
        message: message.trim(),
      });

      if (response.success) {
        setSubmitSuccess(true);
        setSubject("");
        setMessage("");
        
        // Reset success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        setSubmitError(response.error || "Failed to submit ticket. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      setSubmitError(error.message || "Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: "How do I upload a document?",
      answer: "Go to the Upload Document page and drag & drop your file or click to browse. Supported formats include PDF, Excel, CSV, and images.",
    },
    {
      question: "What file formats are supported?",
      answer: "FinSight supports PDF, Excel (.xlsx, .xls), CSV files, and scanned images (JPG, PNG).",
    },
    {
      question: "How long does processing take?",
      answer: "Most documents are processed within 3-5 seconds. Larger files may take up to 30 seconds.",
    },
    {
      question: "Can I download processed documents?",
      answer: "Yes! You can download your processed documents from the History page. Click the download icon next to any completed document.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. All documents are encrypted and stored securely. We follow industry-standard security practices to protect your data.",
    },
  ];

  const resources = [
    { icon: <Book className="w-5 h-5" />, title: "Documentation", description: "Comprehensive guides and tutorials" },
    { icon: <Video className="w-5 h-5" />, title: "Video Tutorials", description: "Step-by-step video guides" },
    { icon: <MessageCircle className="w-5 h-5" />, title: "Community Forum", description: "Connect with other users" },
  ];

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
              active
              onClick={() => navigate("/dashboard/support")}
            />
            <SidebarLink 
              icon={<Settings className="w-5 h-5" />} 
              label="Settings" 
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
            Support
          </h1>
        </header>

        {/* ---------- SUPPORT CONTENT ---------- */}
        <div className="flex-1 overflow-y-auto flex flex-col px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Search Bar */}
            <div className="bg-white p-4 sm:p-6 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for help articles..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all duration-200"
                />
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Contact Support</h2>
              </div>
              <p className="text-[#64748B] mb-4 leading-[1.6]">
                Have a question or need help? Send us a message and we'll get back to you as soon as possible.
              </p>
              
              {submitSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    Your support ticket has been submitted successfully! We'll get back to you soon.
                  </p>
                </div>
              )}

              {submitError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 tracking-[-0.01em]">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all duration-200"
                    placeholder="Enter a subject for your ticket..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2 tracking-[-0.01em]">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all duration-200 resize-none"
                    placeholder="Describe your issue or question..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#1E40AF] to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold hover:from-[#1E3A8A] hover:to-[#7C3AED] shadow-[0_4px_12px_rgba(30,64,175,0.3)] hover:shadow-[0_6px_16px_rgba(30,64,175,0.4)] transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* FAQ Section */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-4">
                {faqItems.map((faq, index) => (
                  <div key={index} className="border-2 border-[#E5E7EB] rounded-xl p-4 hover:bg-[#F8FAFC] hover:border-[#1E40AF]/30 transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0F172A] mb-2">{faq.question}</h3>
                        <p className="text-sm text-[#64748B] leading-[1.6]">{faq.answer}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#94A3B8] ml-4 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <Book className="w-6 h-6 text-[#1E40AF]" />
                <h2 className="text-lg font-semibold text-[#0F172A]">Helpful Resources</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resources.map((resource, index) => (
                  <div
                    key={index}
                    className="border-2 border-[#E5E7EB] rounded-xl p-4 hover:bg-gradient-to-br hover:from-[#EFF6FF] hover:to-[#DBEAFE] hover:border-[#1E40AF]/30 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-[#1E40AF]">{resource.icon}</div>
                      <h3 className="font-semibold text-[#0F172A]">{resource.title}</h3>
                    </div>
                    <p className="text-sm text-[#64748B] leading-[1.6]">{resource.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-r from-[#1E40AF] to-[#7C3AED] text-white p-4 sm:p-6 md:p-8 rounded-[20px] shadow-[0_8px_24px_rgba(30,64,175,0.35)]">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6" />
                <h2 className="text-lg font-semibold">Still Need Help?</h2>
              </div>
              <p className="mb-4 leading-[1.6]">
                Reach out to us directly via email at{" "}
                <a href="mailto:support@finsight.com" className="underline font-semibold hover:opacity-90 transition-opacity">
                  support@finsight.com
                </a>
              </p>
              <p className="text-sm opacity-90">
                Our support team is available Monday-Friday, 9 AM - 6 PM EST
              </p>
            </div>
          </div>
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

export default SupportPage;


