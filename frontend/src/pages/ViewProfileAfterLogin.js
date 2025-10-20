
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { useEffect,useState } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";
import Loader from "../Components/Loader";

export default function ViewProfileAfterLogin() {
  // local state for input fields
  const [name, setName] = useState("");
  const navigator = useNavigate()
  const [username, setUsername] = useState("");
  const [isloading,setIsLoading] = useState(false)

    const fetchInfo = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`${config.BACKEND_URL}/`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        setIsLoading(false)
        if (res.ok) {
            setName(data.name)
            setUsername(data.username)
          //console.log("User verified successfully");
        }
      } catch (error) {
        console.error("User verification failed:", error.message);
      }
    };

    useEffect(() => {
        fetchInfo()
    }, [])
    

  // simple handler for save (you can connect API later)
  const saveInfo = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${config.BACKEND_URL}/modify-profile`, {
        method: "POST",
        body:JSON.stringify({name,username}),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        setIsLoading(false)
        navigator(`${data.route}`)
        //console.log("User verified successfully");
      }
    } catch (error) {
        alert("Error occured.")
      console.error("User verification failed:", error.message);
    }
  };
  const handleSave = () => {
    saveInfo();
  };

  return (
    <>
    <Loader isloading={isloading}></Loader>
    <div className="text-black flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Main profile card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-white shadow-xl rounded-2xl p-8 w-[90%] max-w-[400px] text-center border border-gray-100"
      >
        {/* Profile avatar */}
        <div className="absolute -top-14 left-1/2 transform -translate-x-1/2">
          <div className="w-28 h-28 bg-gradient-to-tr from-indigo-400 to-pink-400 rounded-full flex justify-center items-center shadow-lg">
            <User className="w-14 h-14 text-white" />
          </div>
        </div>

        {/* Spacing for avatar overlap */}
        <div className="pt-16">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Edit Profile
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            Update your personal details below
          </p>

          {/* Name field */}
          <div className="mb-4 text-left">
            <label className="block text-gray-600 mb-1 font-medium">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          {/* Username field */}
          <div className="mb-6 text-left">
            <label className="block text-gray-600 mb-1 font-medium">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
            />
          </div>

          {/* Save button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition"
          >
            Save Changes
          </motion.button>
        </div>
      </motion.div>
    </div>
    </>
  );
}
