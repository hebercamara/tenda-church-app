import React from 'react';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#991B1B]"></div>
  </div>
);

export default LoadingSpinner;