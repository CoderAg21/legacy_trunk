import React, { useState } from "react";
import { Plus, Key, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import config from "../config";
import Loader from "./Loader";


export default function FamilySelection() {
  // --- STATE MANAGEMENT ---
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [familyId, setFamilyId] = useState(""); // For joining
  const [adminUsername, setAdminUsername] = useState(""); // For joining by username
  const [familyName, setFamilyName] = useState(""); // For creation
  const [generatedKey, setGeneratedKey] = useState("");
  
  const navigate = useNavigate();

  // --- HELPER FUNCTIONS ---
  const generateFamilyId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "";
    for (let i = 0; i < 8; i++) {
      if (i === 4) key += "-";
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  // --- DIALOG HANDLERS ---
  const handleCreateDialogOpen = () => {
    setGeneratedKey(generateFamilyId());
    setShowCreateDialog(true);
  };
  
  const resetFormState = () => {
      setFamilyId("");
      setAdminUsername("");
      setFamilyName("");
  }

  // --- API CALLS ---
  const handleJoinFamily = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!familyId && !adminUsername) {
        // Using a custom modal/toast would be better than alert() in a real app.
        alert("Please enter a Family Key or an Admin's Username.");
        setIsSubmitting(false);
        return;
    }

    try {
      const res = await fetch(`${config.BACKEND_URL}/join-family/send-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send both fields; the backend will prioritize.
        body: JSON.stringify({ family_id: familyId, family_username: adminUsername }),
        credentials: "include",
      });
      const data = await res.json();

      alert(data.message || (res.ok ? "Request sent successfully!" : "Failed to send request."));

      if (res.ok) {
        setShowJoinDialog(false);
        resetFormState();
      }
    } catch (error) {
      console.error("Join Family Error:", error);
      alert("A network or server error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${config.BACKEND_URL}/create-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_name: familyName,
          family_id: generatedKey, // The auto-generated key
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Family "${data.family_name || familyName}" created successfully!`);
        setShowCreateDialog(false);
        resetFormState();
        if (data.route) {
          navigate(data.route);
        }
      } else {
        alert(`Error: ${data.message || "Unable to create family."}`);
      }
    } catch (error) {
      console.error("Create Family Error:", error);
      alert("A network or server error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-blue-400 to-purple-500 flex items-center justify-center p-4 text-gray-900">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Welcome</h1>
          <p className="text-lg text-gray-200">
            Join your family or create a new one to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div onClick={() => setShowJoinDialog(true)} className="cursor-pointer bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6"><Key className="w-8 h-8 text-white" /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Join a Family</h2>
            <p className="text-gray-700 mb-6">Already have a family key? Join your family now and connect with your loved ones.</p>
            <div className="flex items-center text-blue-600 font-semibold gap-2">Enter Family Key →</div>
          </div>
          <div onClick={handleCreateDialogOpen} className="cursor-pointer bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6"><Plus className="w-8 h-8 text-white" /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Create a Family</h2>
            <p className="text-gray-700 mb-6">Start a new family and become the leader. Invite others to join your circle.</p>
            <div className="flex items-center text-purple-600 font-semibold gap-2">Get Started →</div>
          </div>
        </div>

        {/* Join Dialog Modal */}
        {showJoinDialog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-600"><Key className="w-6 h-6" /> Join Family</h2>
              <p className="text-sm text-gray-600 mb-4">Enter a family key OR the family admin's email to find a family and send a request to join.</p>
              <form onSubmit={handleJoinFamily} className="space-y-4">
                <input className="w-full border rounded-lg p-3" placeholder="Enter Family Key (e.g., ABCD-1234)" value={familyId} onChange={(e) => setFamilyId(e.target.value)} />
                <div className="Or w-full text-center font-bold text-gray-600">OR</div>
                <input type="email" className="w-full border rounded-lg p-3" placeholder="Enter Family Admin's email" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} />
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400">{isSubmitting ? "Sending Request..." : "Send Join Request"}</button>
                <button type="button" onClick={() => setShowJoinDialog(false)} className="w-full border py-3 rounded-lg mt-2">Cancel</button>
              </form>
            </div>
          </div>
        )}

        {/* Create Dialog Modal */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-purple-600"><Sparkles className="w-6 h-6" /> Create Family</h2>
              <form onSubmit={handleCreateFamily} className="space-y-4">
                <input className="w-full border rounded-lg p-3" placeholder="Family Name" value={familyName} onChange={(e) => setFamilyName(e.target.value)} required />
                <div className="flex items-center justify-between border rounded-lg p-3 bg-purple-50">
                  <span className="font-mono text-purple-700 font-bold">{generatedKey}</span>
                  <button type="button" onClick={() => setGeneratedKey(generateFamilyId())} className="text-purple-600 font-semibold">Refresh</button>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:bg-purple-400">{isSubmitting ? "Creating..." : "Create Family"}</button>
                <button type="button" onClick={() => setShowCreateDialog(false)} className="w-full border py-3 rounded-lg mt-2">Cancel</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

