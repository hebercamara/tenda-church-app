import React from 'react';

const MetricCard = ({ icon: Icon, title, value, unit, color }) => {
  const textColor = color || '#3B82F6'; // Cor padrão azul

  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl shadow-md flex items-center space-x-2 sm:space-x-4">
      <div className={`p-2 sm:p-3 rounded-full flex-shrink-0`} style={{ backgroundColor: `${textColor}20` }}>
        <Icon size={18} className="sm:w-6 sm:h-6" style={{ color: textColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
          {value}
          {unit && <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-600">{unit}</span>}
        </p>
      </div>
    </div>
  );
};

export default React.memo(MetricCard);