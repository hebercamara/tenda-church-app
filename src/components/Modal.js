import React from 'react';
import { X } from 'lucide-react';

const Modal = React.memo(({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto transform transition-all scale-95 hover:scale-100 duration-300">
        <header className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full p-2 transition-all flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </header>
        <main className="p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
});

export default Modal;