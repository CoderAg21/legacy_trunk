import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import config from "../config";
import Loader from "./Loader"; // 1. IMPORT THE LOADER

// A simple spinner for individual media loading, as the main Loader is a full overlay.
const MediaSpinner = () => (
  <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-solid border-white border-t-transparent"></div>
);


export default function StatusViewer() {
  const navigate = useNavigate();
  const { who } = useParams();

  // 2. UPDATE STATE
  const [stories, setStories] = useState(null); // Use null to easily track initial fetch
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false); // State for individual media

  const intervalRef = useRef(null);
  const videoRef = useRef(null);

  const fetchStories = async () => {
    try {
      const res = await fetch(`${config.BACKEND_URL}/${who}/fetch-stories/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setStories(data.stories || []); // Set stories or an empty array
    } catch (error) {
      console.error("Failed to fetch stories", error);
      setStories([]); // Set empty array on error to remove loader
    }
  };

  useEffect(() => {
    fetchStories();
  }, [who]);

  // This effect resets the state for each new story
  useEffect(() => {
    if (stories) {
      clearInterval(intervalRef.current);
      setProgress(0);
      setIsMediaLoaded(false); // Reset for the new story's media
    }
  }, [currentIndex, stories]);

  // This effect starts the timer ONLY when the media has loaded
  useEffect(() => {
    if (isMediaLoaded) {
      const currentStory = stories[currentIndex];
      if (currentStory?.mediaType === "video" && videoRef.current) {
        const videoDuration = videoRef.current.duration * 1000;
        startProgress(videoDuration);
      } else {
        startProgress(5000); // 5 seconds for images
      }
    }
  }, [isMediaLoaded, currentIndex]);


  const startProgress = (duration) => {
    setProgress(0);
    clearInterval(intervalRef.current);
    const increment = 100 / (duration / 100);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, 100);
  };
  
  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigate("/dashboard");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 3. SHOW LOADER FOR INITIAL FETCH
  if (stories === null) {
    return <Loader isLoading={true} />;
  }

  return (
    <>
      <Helmet>
        <title>Stories</title>
        <meta name="description" content="View stories" />
      </Helmet>

      {stories.length > 0 ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
          {/* Progress bars */}
          <div className="absolute top-2 left-0 right-0 z-10 flex gap-1 px-3">
            {stories.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded bg-gray-600">
                <div
                  className="h-1 bg-white"
                  style={{
                    transition: i === currentIndex && isMediaLoaded ? "width 100ms linear" : "none",
                    width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          
          <div className="absolute top-8 left-4 z-10 font-semibold text-white">
             {stories[currentIndex].title}
          </div>

          <div className="relative flex h-[80vh] w-full max-w-md items-center justify-center">
            {/* 4. SHOW SPINNER FOR EACH STORY'S MEDIA */}
            {!isMediaLoaded && <MediaSpinner />}
            
            {stories[currentIndex]?.mediaType === "video" ? (
              <video
                ref={videoRef}
                src={stories[currentIndex]?.media}
                className={`h-full w-full rounded-lg object-contain ${isMediaLoaded ? 'visible' : 'invisible'}`}
                autoPlay
                muted
                playsInline
                onCanPlay={() => setIsMediaLoaded(true)} // Set loaded to true
              />
            ) : (
              <img
                src={stories[currentIndex]?.media}
                alt="status"
                className={`h-full w-full rounded-lg object-contain ${isMediaLoaded ? 'visible' : 'invisible'}`}
                onLoad={() => setIsMediaLoaded(true)} // Set loaded to true
              />
            )}
          </div>
         
          <div className="mt-4 flex gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="rounded bg-gray-700 px-4 py-2 disabled:opacity-40"
            >
              Prev
            </button>
            <button onClick={handleNext} className="rounded bg-green-600 px-4 py-2">
              {currentIndex === stories.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      ) : (
        <p>
          <b className="block text-center text-black">
            Not uploaded any story!!
          </b>
        </p>
      )}
    </>
  );
}