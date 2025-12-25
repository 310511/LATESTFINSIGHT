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
  FileText,
  Eye,
  Download,
  Trash2,
  Calendar,
  Filter,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../firebase/useAuth";
import { logOut } from "../firebase/auth";
import { documentAPI } from "../services/api";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const itemsPerPage = 20;

  const handleLogout = async () => {
    const result = await logOut();
    if (result.success) {
      navigate("/");
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch documents from database
  const fetchDocuments = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await documentAPI.getHistory(params);

      // Format documents for display
      const formattedDocs = response.documents?.map((doc) => ({
        id: doc.document_id,
        name: doc.original_filename,
        type: doc.document_type || "Unknown",
        uploadedAt: formatDate(doc.created_at),
        processedAt: formatDate(doc.processing_completed_at),
        status: doc.processing_status === "completed" ? "Completed" :
                doc.processing_status === "processing" ? "Processing" :
                doc.processing_status === "failed" ? "Failed" : "Pending",
        size: formatFileSize(doc.file_size),
        documentId: doc.document_id,
        rawStatus: doc.processing_status,
      })) || [];

      setHistoryItems(formattedDocs);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalDocuments(response.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents on mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [currentUser, currentPage, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchDocuments();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle document actions
  const handleViewDocument = (documentId) => {
    navigate(`/dashboard/results/${documentId}`);
  };

  const handleDownloadDocument = async (documentId) => {
    try {
      const downloadData = await documentAPI.getDownloadUrl(documentId, "pdf");
      if (downloadData.download_url) {
        window.open(downloadData.download_url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document. Please try again.");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      await documentAPI.delete(documentId);
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document. Please try again.");
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#F8FAFC] via-blue-50/20 to-purple-50/20 font-sans">
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
              active
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
      <main className="flex-1 flex flex-col">
        {/* ---------- TOP BAR ---------- */}
        <header className="flex items-center justify-between bg-white/80 backdrop-blur-xl px-6 lg:px-8 py-4 lg:py-5 shadow-sm border-b border-[#E5E7EB]/50">
          <h1 className="text-lg md:text-xl lg:text-2xl font-semibold text-[#0F172A] tracking-[-0.01em] leading-[1.3]">
            Document History
          </h1>

          <div className="flex items-center space-x-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 flex items-center justify-center border border-blue-100/50">
              <FileText className="text-[#1E40AF] w-5 h-5" />
            </div>
          </div>
        </header>

        {/* ---------- HISTORY CONTENT ---------- */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#E5E7EB]/60 p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-11 pr-4 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 focus:border-[#1E40AF] transition-all duration-200"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 border border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFC] hover:border-[#1E40AF]/30 transition-all duration-200 text-sm font-medium text-[#64748B] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
                <button className="flex items-center justify-center gap-2 px-5 py-2.5 border border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFC] hover:border-[#1E40AF]/30 transition-all duration-200 text-sm font-medium text-[#64748B] hover:text-[#0F172A]">
                  <Calendar className="w-4 h-4" />
                  Date Range
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#E5E7EB]/60 overflow-hidden">
              <div className="px-5 lg:px-6 py-4 lg:py-5 border-b border-[#E5E7EB] bg-gradient-to-r from-[#F8FAFC]/50 to-transparent">
                <h3 className="text-base lg:text-lg font-semibold text-[#0F172A] tracking-[-0.01em] leading-[1.3]">
                  All Documents ({totalDocuments})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[#64748B] bg-[#F8FAFC]/80 border-b border-[#E5E7EB]">
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Document Name</th>
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Type</th>
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Uploaded</th>
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Processed</th>
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Size</th>
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="py-3 lg:py-4 px-4 lg:px-6 font-semibold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                        </td>
                      </tr>
                    ) : historyItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-500">
                          No documents found. Upload your first document to get started!
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((item) => (
                        <tr
                          key={item.id}
                          className="bg-white hover:bg-[#F8FAFC]/50 transition-colors duration-150"
                        >
                          <td className="py-3 lg:py-4 px-4 lg:px-6 font-medium text-[#0F172A]">
                            {item.name}
                          </td>
                          <td className="py-3 lg:py-4 px-4 lg:px-6 text-[#64748B]">{item.type}</td>
                          <td className="py-3 lg:py-4 px-4 lg:px-6 text-[#64748B]">{item.uploadedAt}</td>
                          <td className="py-3 lg:py-4 px-4 lg:px-6 text-[#64748B]">{item.processedAt}</td>
                          <td className="py-3 lg:py-4 px-4 lg:px-6 text-[#64748B]">{item.size}</td>
                          <td className="py-3 lg:py-4 px-4 lg:px-6">
                            <span
                              className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full border ${
                                item.status === "Completed"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : item.status === "Failed"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : item.status === "Processing"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 lg:py-4 px-4 lg:px-6">
                            <div className="flex items-center gap-2 lg:gap-3">
                              <button
                                onClick={() => handleViewDocument(item.documentId)}
                                className="p-2 text-[#94A3B8] hover:text-[#1E40AF] hover:bg-[#EFF6FF] rounded-lg transition-all duration-200"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {item.status === "Completed" && (
                                <button
                                  onClick={() => handleDownloadDocument(item.documentId)}
                                  className="p-2 text-[#94A3B8] hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteDocument(item.documentId)}
                                className="p-2 text-[#94A3B8] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 lg:px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between">
                  <div className="text-sm text-[#64748B]">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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

export default HistoryPage;


