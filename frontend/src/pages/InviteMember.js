import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import config from "../config";


export default function InviteMember() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${config.BACKEND_URL}/join-family/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await res.json();
      setMsg(data.message || "Invitation sent successfully!");
    } catch (err) {
      console.error(err);
      setMsg("Error sending invitation. Please try again.");
    } finally {
      setLoading(false);
      setEmail("");
    }
  };

  return (
    <div className="text-black min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative"
      >
        {/* Back Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/dashboard")}
          className="absolute top-4 left-4 flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </motion.button>

        {/* Header */}
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8 mt-4">
          Invite someone to your <span className="text-indigo-600">Family</span>
        </h2>

        {/* Invite Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-gray-700 mb-1 font-medium"
            >
              Email to invite
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="user@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </motion.button>
        </form>

        {/* Message Display */}
        {msg && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center text-sm mt-4 ${
              msg.toLowerCase().includes("error")
                ? "text-red-500"
                : "text-green-600"
            }`}
          >
            {msg}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
