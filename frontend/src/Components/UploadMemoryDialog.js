import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Calendar, Tag,Sparkles  } from "lucide-react";
import config from "../config";

const availableTags = [
  "Birthday",
  "Festival",
  "Vacation",
  "Achievement",
  "Family Gathering",
  "Anniversary",
  "Graduation",
  "Wedding",
];

// Your FastAPI endpoint
const FASTAPI_URL = "http://127.0.0.1:8000/predict-tags/";

export default function UploadMemoryDialog({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const [formData, setFormData] = useState({
    text: "",
    description: "",
    upload_date: new Date().toISOString().split("T")[0],
    tags: [],
  });

  // Toggle manual tag
  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // 🔮 Generate AI Tags from FastAPI
  const handleGenerateTags = async () => {
    if (!formData.text.trim() && !formData.description.trim()) {
      alert("Please enter a title or description first!");
      return;
    }

    setIsGeneratingTags(true);
    try {
      const res = await fetch(FASTAPI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.text,
          description: formData.description,
          top_k: 5,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const aiTags = data.map((item) => item.tag);
        setFormData((prev) => ({
          ...prev,
          tags: [...new Set([...prev.tags, ...aiTags])], // merge AI + manual tags
        }));
        alert(`AI suggested tags: ${aiTags.join(", ")}`);
      } else {
        alert("Failed to generate tags from AI");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to AI Tag Generator");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // 🧾 Handle Upload Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("text", formData.text);
      formDataToSend.append("description", formData.description);
      formData.tags.forEach((tag) => formDataToSend.append("tags", tag));
      formDataToSend.append("tags_input", formData.tags.join(" "));
      if (file) formDataToSend.append("files", file);

      const res = await fetch(`${config.BACKEND_URL}/add-media`, {
        method: "POST",
        body: formDataToSend,
        credentials: "include",
      });

      const urlImage = await res.json();

      if (res.ok) {
        const formDataObj = Object.fromEntries(formDataToSend.entries());
        alert("Memory uploaded successfully!");
        onSuccess({
          ...formDataObj,
          tags: formData.tags.join(", "),
          media: urlImage.media,
        });
        handleClose();
      } else {
        console.error("Upload failed:", await res.text());
        alert("Failed to upload memory");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while uploading");
    } finally {
      setIsUploading(false);
    }
  };

  // Reset and close modal
  const handleClose = () => {
    setFormData({
      text: "",
      description: "",
      upload_date: new Date().toISOString().split("T")[0],
      tags: [],
    });
    setFile(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden text-black">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  Upload Memory
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
              encType="multipart/form-data"
            >
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.text}
                    onChange={(e) =>
                      setFormData({ ...formData, text: e.target.value })
                    }
                    placeholder="Give your memory a title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* AI Tag Generator */}
                <button
                  type="button"
                  onClick={handleGenerateTags}
                  disabled={isGeneratingTags}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5" />
                  {isGeneratingTags ? "Generating..." : "Generate Tags by AI"}
                </button>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Tell the story behind this memory..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Timeline Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Timeline Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.upload_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        upload_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.concat(formData.tags.filter(t => !availableTags.includes(t))).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.tags.includes(tag)
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Upload Photo *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-emerald-400 transition-all">
                    <input
                      required
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                    {file && (
                      <p className="mt-2 text-sm text-emerald-600">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit & Cancel */}
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isUploading ? "Uploading..." : "Upload Memory"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}