// src/components/Loader.js

import React from 'react';

/**
 * A reusable loader component.
 * @param {object} props - The component props.
 * @param {boolean} props.isLoading - If true, the loader is displayed.
 */
export default function Loader({ isLoading }) {
  // If not loading, render nothing.
  if (!isLoading) {
    return null;
  }

  return (
    // Overlay container
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {/* The spinning circle */}
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-white border-t-transparent"></div>
    </div>
  );
}