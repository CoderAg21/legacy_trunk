import React, { useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import config from "../config";
import { useNavigate } from "react-router-dom";
export default function Navbar2() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigator = useNavigate();
  const dummyUser = {
    name: "John Doe",
    email: "johndoe@example.com",
    avatar_url: "https://i.pravatar.cc/150?img=3", // random avatar
  };
  const [user, setUser] = useState(dummyUser);
  const [loading, setLoading] = useState("Get PDF");

  const fetchUser = async () => {
    try {
      const res = await fetch(`${config.BACKEND_URL}/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data);
      }
    } catch (error) {
      console.error("User verification failed:", error.message);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const viewStories = () => {
    navigator("/user/view-stories");
  };
  const viewPosts = () => {
    navigator("/posts");
  };
  const inviteMember = () => {
    navigator("/invite");
  };
  const viewRequests = () => {
    navigator("/requests");
  };

  const handleLogout = async () => {
    const res = await fetch(`${config.BACKEND_URL}/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      navigator("/");
    }
  };
  const handlePdf = async () => {
    setLoading("Loading...");
    try {
      const response = await fetch(`${config.BACKEND_URL}/download-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ familyId: user.family_id }), // Corrected to send userId
      });
      if (!response.ok) {
        throw new Error('PDF generation failed');
      }
      setLoading("Get PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Memories.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error while downloading PDF:", err);
      setLoading("Get PDF"); // Reset button on error
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-emerald-50/90 via-green-50/90 to-teal-50/90 border-b border-emerald-100/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Logo and Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
              Ghraondha
            </h1>
          </motion.div>

          {/* Right side: Group for PDF button and Profile */}
          <div className="flex items-center gap-4">
            {/* PDF Button */}
            <div
              className="btn flex items-center text-white rounded-md bg-red-700 h-8 px-3 py-1 cursor-pointer"
              onClick={handlePdf}
            >
              <button disabled={loading !== 'Get PDF'} className="mr-2 hidden sm:inline-block">{loading}</button>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> <polyline points="7 10 12 15 17 10" /> <line x1="12" x2="12" y1="15" y2="3" /> </svg>
            </div>

            {/* Profile Button and Dropdown */}
            <div className="relative flex">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-2 rounded-full hover:bg-white/50 transition-all duration-200"
              >
                <img
                  src="https://icons.veryicon.com/png/o/miscellaneous/standard/avatar-15.png"
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full shadow-md"
                />
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    // Adjusted for clear visibility
                    className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-green-50">
                      <p className="font-semibold text-gray-800">
                        {user?.name || "Guest"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user?.username || ""}
                      </p>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigator("/view/your-profile");
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                      >
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Your Profile</span>
                      </button>

                      <button
                        onClick={viewStories}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                      >
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Your Stories</span>
                      </button>

                      <button
                        onClick={viewPosts}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                      >
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Your Posts</span>
                      </button>

                      <button
                        onClick={viewRequests}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                      >
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">View Family Requests</span>
                      </button>

                      <button
                        onClick={inviteMember}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors duration-200"
                      >
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Invite a member</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 transition-colors duration-200 text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}