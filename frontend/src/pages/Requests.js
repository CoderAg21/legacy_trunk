import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import config from "../config";
import Loader from "../Components/Loader";

export default function Requests() {
  const [family, setFamily] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending requests from backend
 useEffect(() => {
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${config.BACKEND_URL}/join-family/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ensures session cookies are sent
        body: JSON.stringify({
          action: "getRequests", // optional for backend validation
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setFamily(data.family);
        setRequests(data.pendingRequests || []);
        

      } else {
        console.error(" Error fetching requests:", data.message);
      }
    } catch (err) {
      console.error(" Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchRequests();
}, []);


  // Approve/Reject a request
  const handleAction = async (requestId,familyId, action) => {
    try {
      setLoading(true)
      const res = await fetch(
        `${config.BACKEND_URL}/join-family/requests/${familyId}/${requestId}/${action}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",}
      );
      const data = await res.json();
      //console.log(`${action} response:`, data);
      alert(data.message);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));

      if (res.ok) {
        setLoading(false)
      } else {
        alert(data.message || "Action failed");
      }
    } catch (err) {
      console.error(`${action} error:`, err.message);
    }
  };

  return (
    <>
    <Loader isLoading={loading}/>
    <div className="text-black min-h-screen flex flex-col items-center py-10 px-4">
      <motion.div
        className="max-w-4xl w-full rounded-2xl shadow-lg p-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Pending Join Requests
          </h1>
          <p className="text-gray-500 mt-1">
            Family: {family?.family_name || "N/A"}
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300 transition"
          >
            Back to Home
          </a>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-medium">
            No pending requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="py-3 px-4 border-b">Username</th>
                  <th className="py-3 px-4 border-b">Requested At</th>
                  <th className="py-3 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req._id}
                    className="text-center border-b hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-4">{req.name}</td>
                    <td className="py-3 px-4">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleAction(req.userId,req.familyId, "approve")}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md text-sm mr-2 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req.userId,req.familyId, "reject")}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm transition"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
    </>
  );
}
