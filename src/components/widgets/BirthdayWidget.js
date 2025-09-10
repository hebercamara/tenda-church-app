import React, { useMemo } from 'react';
import { Gift } from 'lucide-react';
import { formatDateToBrazilian } from '../../utils/dateUtils';

const BirthdayWidget = ({ members }) => {
  const currentMonth = new Date().getMonth() + 1;

  const birthdayMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(member => {
      if (!member.dob) return false;
      const memberMonth = parseInt(member.dob.split('-')[1], 10);
      return memberMonth === currentMonth;
    }).sort((a, b) => {
        const dayA = parseInt(a.dob.split('-')[2], 10);
        const dayB = parseInt(b.dob.split('-')[2], 10);
        return dayA - dayB;
    });
  }, [members, currentMonth]);

  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md h-full">
      <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
        <Gift size={20} className="sm:w-6 sm:h-6 text-pink-500 flex-shrink-0" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Aniversariantes do Mês</h3>
      </div>
      {birthdayMembers.length > 0 ? (
        <ul className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-1 sm:pr-2">
          {birthdayMembers.map(member => (
            <li key={member.id} className="flex justify-between items-center text-xs sm:text-sm gap-2">
              <span className="truncate flex-1">{member.name}</span>
              <span className="font-semibold text-gray-600 flex-shrink-0">
                {formatDateToBrazilian(member.dob, { day: '2-digit', month: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-xs sm:text-sm">Nenhum aniversariante este mês.</p>
      )}
    </div>
  );
};

export default React.memo(BirthdayWidget);