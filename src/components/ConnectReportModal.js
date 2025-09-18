import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import Modal from './Modal';
import { formatDateToBrazilian, convertBrazilianDateToISO } from '../utils/dateUtils';

const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };

// Componente de seleção de data em português brasileiro
const BrazilianDatePicker = ({ value, onChange, className }) => {
    const hiddenInputRef = useRef(null);
    const [displayValue, setDisplayValue] = useState('');
    
    // Atualiza o valor de exibição quando o valor ISO muda
    useEffect(() => {
        if (value) {
            const date = new Date(value + 'T12:00:00');
            setDisplayValue(date.toLocaleDateString('pt-BR'));
        } else {
            setDisplayValue('');
        }
    }, [value]);
    
    const handleDisplayClick = () => {
        if (hiddenInputRef.current) {
            // Tenta usar showPicker primeiro, se não funcionar, foca no input
            try {
                if (hiddenInputRef.current.showPicker) {
                    hiddenInputRef.current.showPicker();
                } else {
                    hiddenInputRef.current.focus();
                    hiddenInputRef.current.click();
                }
            } catch (error) {
                // Fallback: foca no input oculto
                hiddenInputRef.current.focus();
                hiddenInputRef.current.click();
            }
        }
    };
    
    const handleDateChange = (e) => {
        onChange(e.target.value);
    };
    
    const handleDisplayChange = (e) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue);
        
        // Tenta converter a data digitada para formato ISO
        if (inputValue.length === 10) { // dd/mm/aaaa
            const parts = inputValue.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                
                if (day.length === 2 && month.length === 2 && year.length === 4) {
                    const isoDate = `${year}-${month}-${day}`;
                    const testDate = new Date(isoDate + 'T12:00:00');
                    
                    // Verifica se a data é válida
                    if (!isNaN(testDate.getTime()) && 
                        testDate.getDate() == day && 
                        testDate.getMonth() + 1 == month && 
                        testDate.getFullYear() == year) {
                        onChange(isoDate);
                    }
                }
            }
        }
    };
    
    const handleDisplayKeyDown = (e) => {
        // Permite apenas números, barras e teclas de navegação
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
        if (!allowedKeys.includes(e.key) && !/[0-9\/]/.test(e.key)) {
            e.preventDefault();
        }
        
        // Auto-adiciona barras
        if (/[0-9]/.test(e.key)) {
            const currentValue = e.target.value;
            if (currentValue.length === 2 || currentValue.length === 5) {
                if (!currentValue.endsWith('/')) {
                    setDisplayValue(currentValue + '/');
                }
            }
        }
    };
    
    return (
        <div className="relative">
            <div className="relative">
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleDisplayChange}
                    onKeyDown={handleDisplayKeyDown}
                    placeholder="dd/mm/aaaa"
                    maxLength="10"
                    className={`${className} pr-10`}
                />
                <button
                    type="button"
                    onClick={handleDisplayClick}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer z-10"
                    title="Abrir calendário"
                >
                    📅
                </button>
            </div>
            <input
                ref={hiddenInputRef}
                type="date"
                value={value}
                onChange={handleDateChange}
                className="absolute opacity-0 pointer-events-auto w-full h-full top-0 left-0"
                style={{ zIndex: -1 }}
            />
        </div>
    );
};

const ConnectReportModal = ({ isOpen, onClose, connect, members, onSave, isAdmin }) => {
    const [reportDates, setReportDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [attendance, setAttendance] = useState({});
    const [guests, setGuests] = useState('');
    const [offering, setOffering] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const connectMembers = useMemo(() => {
        if (!connect || !selectedDate) return [];
        
        const reportDate = new Date(selectedDate + 'T12:00:00Z');
        
        // Filtra membros que estavam no Connect na data do relatório
        return members.filter(member => {
            // Se o membro está atualmente no Connect
            if (member.connectId === connect.id) {
                // Verifica se já estava no Connect na data do relatório
                if (member.connectHistory && member.connectHistory.length > 0) {
                    const currentEntry = member.connectHistory.find(entry => !entry.endDate);
                    if (currentEntry) {
                        const startDate = currentEntry.startDate.toDate ? currentEntry.startDate.toDate() : new Date(currentEntry.startDate);
                        return reportDate >= startDate;
                    }
                }
                return true; // Se não tem histórico, considera que sempre esteve
            }
            
            // Se o membro não está atualmente no Connect, verifica o histórico
            if (member.connectHistory && member.connectHistory.length > 0) {
                return member.connectHistory.some(entry => {
                    if (entry.connectId !== connect.id) return false;
                    
                    const startDate = entry.startDate.toDate ? entry.startDate.toDate() : new Date(entry.startDate);
                    const endDate = entry.endDate ? (entry.endDate.toDate ? entry.endDate.toDate() : new Date(entry.endDate)) : null;
                    
                    return reportDate >= startDate && (!endDate || reportDate <= endDate);
                });
            }
            
            return false;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [members, connect, selectedDate]);

    // Lógica de seleção de data baseada no papel do usuário (isAdmin)
    useEffect(() => {
        if (!connect) return;

        // Se for Admin, define a data padrão como hoje e permite qualquer data
        if (isAdmin) {
            const today = new Date().toISOString().split('T')[0];
            setSelectedDate(today);
            setReportDates([]); // Limpa as datas do dropdown
            return;
        }

        // Se for Líder, calcula apenas a data da semana atual e anterior
        const getReportDatesForLeader = () => {
            const connectWeekday = weekDaysMap[connect.weekday];
            if (connectWeekday === undefined) return;

            const today = new Date();
            const todayWeekday = today.getDay();
            
            let daysToSubtract = todayWeekday - connectWeekday;
            if (daysToSubtract < 0) {
                daysToSubtract += 7;
            }

            const currentWeekMeeting = new Date(today);
            currentWeekMeeting.setDate(today.getDate() - daysToSubtract);
            const currentWeekDateString = currentWeekMeeting.toISOString().split('T')[0];
            
            const previousWeekMeeting = new Date(currentWeekMeeting);
            previousWeekMeeting.setDate(currentWeekMeeting.getDate() - 7);
            const previousWeekDateString = previousWeekMeeting.toISOString().split('T')[0];
            
            const dates = [
                { label: `Semana Atual (${formatDateToBrazilian(currentWeekMeeting)})`, value: currentWeekDateString },
                { label: `Semana Anterior (${formatDateToBrazilian(previousWeekMeeting)})`, value: previousWeekDateString }
            ];

            setReportDates(dates);
            setSelectedDate(currentWeekDateString);
        };
        
        getReportDatesForLeader();
    }, [connect, isAdmin]);

    // Busca o relatório existente quando a data ou connect mudam
    useEffect(() => {
        if (!selectedDate || !connect) return;

        const fetchReport = async () => {
            setIsLoading(true);
            const reportId = `${connect.id}_${selectedDate}`;
            const reportRef = doc(db, `artifacts/${appId}/public/data/connect_reports`, reportId);
            const reportSnap = await getDoc(reportRef);

            if (reportSnap.exists()) {
                const data = reportSnap.data();
                setAttendance(data.attendance || {});
                setGuests(data.guests?.toString() || '');
                setOffering(data.offering?.toString() || '');
            } else {
                const initialAttendance = {};
                connectMembers.forEach(m => { initialAttendance[m.id] = 'ausente'; });
                setAttendance(initialAttendance);
                setGuests('');
                setOffering('');
            }
            setIsLoading(false);
        };

        fetchReport();
    }, [selectedDate, connect, connectMembers]);
    
    const handleAttendanceChange = (memberId, status) => {
        setAttendance(prev => ({ ...prev, [memberId]: status }));
    };

    const handleSave = () => {
        if (!selectedDate) {
            alert("Por favor, selecione uma data.");
            return;
        }
        const reportData = {
            connectId: connect.id,
            connectName: connect.name,
            leaderId: connect.leaderId,
            leaderName: connect.leaderName,
            reportDate: new Date(selectedDate + 'T12:00:00Z'), // Adiciona hora para evitar problemas de fuso horário
            guests: Number(guests) || 0,
            offering: Number(offering) || 0,
            attendance: attendance
        };
        onSave(reportData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <div className="flex flex-col max-h-[85vh]">
                <div className="flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Relatório do Connect {connect.number}</h2>
                    <p className="text-gray-600 mb-4">{connect.name}</p>

                    {/* Renderização condicional do seletor de data */}
                    {isAdmin ? (
                        <div>
                            <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">Selecione uma data para o relatório (Admin)</label>
                            <BrazilianDatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                                className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">Selecione a data da reunião</label>
                            <select id="reportDate" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]">
                                {reportDates.map(date => <option key={date.value} value={date.value}>{date.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                {isLoading ? <div className="text-center p-8">Carregando relatório...</div> : (
                    <>
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2 mt-4">
                            <fieldset className="border p-4 rounded-md">
                                <legend className="px-2 font-semibold">Presença dos Membros</legend>
                                <div className="space-y-2">
                                    {connectMembers.map(member => (
                                        <div key={member.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                            <span>{member.name}</span>
                                            <div className="flex space-x-2">
                                                <button onClick={() => handleAttendanceChange(member.id, 'presente')} className={`px-3 py-1 text-sm rounded-md ${attendance[member.id] === 'presente' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-200'}`}>Presente</button>
                                                <button onClick={() => handleAttendanceChange(member.id, 'ausente')} className={`px-3 py-1 text-sm rounded-md ${attendance[member.id] === 'ausente' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-red-200'}`}>Ausente</button>
                                            </div>
                                        </div>
                                    ))}
                                    {connectMembers.length === 0 && <p className="text-gray-500">Nenhum membro neste Connect.</p>}
                                </div>
                            </fieldset>
                            <fieldset className="border p-4 rounded-md">
                                <legend className="px-2 font-semibold">Informações Adicionais</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-1">Nº de Convidados</label>
                                        <input type="number" id="guests" value={guests} onChange={e => setGuests(e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="0" />
                                    </div>
                                    <div>
                                        <label htmlFor="offering" className="block text-sm font-medium text-gray-700 mb-1">Valor da Oferta (R$)</label>
                                        <input type="number" id="offering" value={offering} onChange={e => setOffering(e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="0.00" step="0.01"/>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                         <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
                            <button type="button" onClick={handleSave} className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">Salvar Relatório</button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
};

export default ConnectReportModal;