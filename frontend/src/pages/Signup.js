import React from "react";
import { Link } from "react-router-dom";
// I'm assuming the custom styles in login.css can be replaced by Tailwind classes.
// If you have essential custom styles, you can keep this import.
// import "../assets/styles/login.css";
import config from "../config";
import google from "../assets/Images/google.svg";
import insta from "../assets/Images/insta.svg";
import fb from "../assets/Images/fb.svg";

export default function Signup() {
  // --- Logic remains unchanged ---
  const handleGoogle = () => {
    window.open(`${config.BACKEND_URL}/auth/google`, "_self");
  };

  return (
    <>
      {/* Main container that centers the form on the page */}
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        
        <form className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 sm:p-8">
          
          <div className="text-center">
            
            {/* Header Text */}
            <h3 className="text-2xl sm:text-3xl font-semibold text-gray-700">
              Signup to <span className="text-blue-500 font-bold">GHARONDHA</span>
            </h3>

            <p className="text-gray-500 mt-2 mb-6">Your social account</p>
            
            {/* Social Media Icons */}
            <div className="flex justify-center gap-6 my-7">
              {/* Google Icon */}
              <div>
                <img
                  src={google}
                  alt="Google"
                  className="h-12 w-12 rounded-full cursor-pointer transition-transform transform hover:scale-110"
                  id="google"
                  onClick={handleGoogle}
                  title="Login with Google"
                />
              </div>

              {/* Instagram Icon (assuming it will be a link or have a function) */}
              <div>
                <img
                  src={insta}
                  alt="Instagram"
                  className="h-12 w-12 rounded-full cursor-pointer transition-transform transform hover:scale-110"
                  id="instagram"
                  title="Login with Instagram"
                />
              </div>

              {/* Facebook Icon (assuming it will be a link or have a function) */}
              <div>
                <img
                  src={fb}
                  alt="Facebook"
                  className="h-12 w-12 rounded-full cursor-pointer transition-transform transform hover:scale-110"
                  id="facebook"
                  title="Login with Facebook"
                />
              </div>
            </div>

            {/* Link to Signup Page */}
            <p className="text-sm text-gray-600">
              Exisiting user?{" "}
              <Link to="/signup" className="font-medium text-blue-500 hover:underline">
                Click here
              </Link>
            </p>

          </div>
        </form>
      </div>
    </>
  );
}