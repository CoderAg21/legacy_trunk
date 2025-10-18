import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, BookOpen, Menu } from "lucide-react";
import { Helmet } from "react-helmet";
import config from "../config";
import Loader  from "../Components/Loader"

// Components
import Navbar2 from "../Components/Navbar2";
import FamilyContactsSidebar from "../Components/FamilyContactsSidebar";
import TimelineCard from "../Components/TimelineCard";
import ChatOverlay from "../Components/ChatOverlay";
import UploadMemoryDialog from "../Components/UploadMemoryDialog";
import UploadStoryDialog from "../Components/UploadStoryDialog";

// Dummy fallback data for offline UI preview
const dummyMembers = [
  { id: 1, name: "Grandma Lakshmi", status: "Just returned from morning walk", last_seen: "2 minutes ago" },
];

const dummyMemories = [
  {
    id: 1,
    title: "Diwali Celebration 2024",
    description: "Our entire family gathered for Diwali puja. The diyas looked beautiful!",
    upload_date: "2024-11-12T18:30:00Z",
    image_url: "https://images.unsplash.com/photo-1604608672516-f1b9b1a42d1d?w=400",
    memory_type: "photo",
    family_member: "Mummy",
    created_date: "2024-11-12T18:30:00Z",
  },
  
];

export default function Dashboard() {
  const [members, setMembers] = useState(dummyMembers);
  const [memories, setMemories] = useState(dummyMemories);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [yourId, setYourId] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [initialMsg, setInitialMsg] = useState([]);
  const [isAdmin,setIsAdmin] = useState('')
  const [loading,setLoading] = useState(false)

  const observerRefs = useRef([]);

  // 🔹 Verify user authentication and fetch family members
  const verifyUser = async () => {
    try {
      const res = await fetch(`${config.BACKEND_URL}/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        setFamilyName(data.family_name);
        setYourId(data._id);
        setIsAdmin(data.isAdmin)
       
        //console.log("User verified successfully");
      }
    } catch (error) {
      console.error("User verification failed:", error.message);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${config.BACKEND_URL}/family/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.members) {
        setLoading(false)
        setMembers(data.members);
        //console.log("Family members loaded:", data.members.length);
      }
    } catch (error) {
      console.error("Error fetching members:", error.message);
    }
  };
  
  const fetchAllPosts = async () => {
    try {
      const res = await fetch(`${config.BACKEND_URL}/family/fetch-all-posts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      //console.log("Family posts loaded:", data.items);
      if (res.ok) {
        setMemories(data.items);
      }
    } catch (error) {
      console.error("Error fetching members:", error.message);
    }
  };
  useEffect(() => {

    fetchAllPosts();
    verifyUser();
    fetchMembers();
  }, [yourId]);

  // 🔹 Fetch previous chat messages between logged-in user and selected member
  const fetchMsg = async (receiver) => {
    try {
      const res = await fetch(`${config.BACKEND_URL}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: yourId, receiver }),
      });

      const data = await res.json();
      if (res.ok && data.messages) {
        setInitialMsg(data.messages);
        //console.log(`Loaded ${data.messages.length} messages`);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error.message);
    }
  };

  // 🔹 Handle contact click and open chat
  const handleContactClick = (member) => {
    fetchMsg(member.id);
    setSelectedMember(member);
    setIsChatOpen(true);
    setIsSidebarOpen(false);
  };

  // 🔹 Add uploaded memory or story to timeline
  const handleUploadSuccess = (newMemory) => {
    const memoryToAdd = {
      ...newMemory,
      createdAt: new Date(),
   
    };
    setMemories((prev) => [memoryToAdd, ...prev]);
    //console.log(" New memory added:", memoryToAdd);
  };

  // 🔹 Animate cards on scroll (Intersection Observer)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCards((prev) => new Set([...prev, entry.target.dataset.index]));
          }
        }),
      { threshold: 0.2 }
    );

    observerRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [memories]);

  return (
    <>
    <Loader isLoading = {loading}/>
      <Helmet>
        <title>Dashboard</title>
        <meta name="description" content="Welcome to your family dashboard" />
      </Helmet>

      <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 min-h-screen">
        <Navbar2 yourId = {yourId} />

        <div className="flex">
          {/* Sidebar toggle (mobile view) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 left-6 z-30 w-14 h-14 bg-gradient-to-tr from-[#544364] to-pink-500 shadow-[0_20px_50px_rgba(236,72,153,0.4)] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {/* Desktop sidebar */}
          <div className="hidden lg:block lg:w-80 xl:w-96">
            <FamilyContactsSidebar
              members={members}
              onContactClick={handleContactClick}
              isOpen={true}
              onClose={() => {}}
              familyName={familyName}
            />
          </div>

          {/* Mobile sidebar */}
          <div className="lg:hidden">
            <FamilyContactsSidebar
              members={members}
              onContactClick={handleContactClick}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              familyName={familyName}
            />
          </div>

          {/* Main Timeline Section */}
          <main className="flex-1 min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Page Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <h1 className="text-[3rem] font-extrabold leading-[2.2]  bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                  Family Timeline
                </h1>
                <p className="text-gray-600 text-lg">Cherished moments, preserved forever</p>
              </motion.div>

              {/* Timeline Cards */}
              <div className="relative space-y-12 mb-16">
                {memories.map((memory, index) => (
                  <div key={memory.id} ref={(el) => (observerRefs.current[index] = el)} data-index={index}>
                    <TimelineCard memory={memory} index={index} inView={visibleCards.has(String(index))} />
                  </div>
                ))}

                {/* Empty State */}
                {memories.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-200 to-green-300 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No memories yet</h3>
                    <p className="text-gray-500">Start by uploading your first family memory!</p>
                  </motion.div>
                )}
              </div>

              {/* Upload Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid sm:grid-cols-2 gap-4 mb-12"
              >
                <motion.button
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsMemoryDialogOpen(true)}
                  className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative z-10 flex flex-col items-center text-white">
                    <div className="w-16 h-16 mb-4 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Upload Memory</h3>
                    <p className="text-white/80 text-sm">Share a special moment</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsStoryDialogOpen(true)}
                  className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-lime-400 via-emerald-500 to-green-600 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative z-10 flex flex-col items-center text-white">
                    <div className="w-16 h-16 mb-4 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Upload Story</h3>
                    <p className="text-white/80 text-sm">Tell a family tale</p>
                  </div>
                </motion.button>
              </motion.div>

              {/* Footer */}
              <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center py-8 text-gray-500 text-sm"
              >
                © {new Date().getFullYear()} made with ❤️ by Team TimeHackers
              </motion.footer>
            </div>
          </main>
        </div>

        {/* Chat and Upload Dialogs */}
        <ChatOverlay initialMsg={initialMsg} member={selectedMember} isOpen={isChatOpen} yourId={yourId} onClose={() => setIsChatOpen(false)} />

        <UploadMemoryDialog isOpen={isMemoryDialogOpen} onClose={() => setIsMemoryDialogOpen(false)} onSuccess={handleUploadSuccess} />

        <UploadStoryDialog isOpen={isStoryDialogOpen} onClose={() => setIsStoryDialogOpen(false)} onSuccess={handleUploadSuccess} familyMembers={members} />
      </div>
    </>
  );
}
