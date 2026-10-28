import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getTenantId } from '../utils/tenantUtils';
import Modal from './Modal';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const getConnectWeekdayIndex = (weekday) => {
    if (!weekday) return null;
    const clean = weekday.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (clean.startsWith('dom')) return 0;
    if (clean.startsWith('seg')) return 1;
    if (clean.startsWith('ter')) return 2;
    if (clean.startsWith('qua')) return 3;
    if (clean.startsWith('qui')) return 4;
    if (clean.startsWith('sex')) return 5;
    if (clean.startsWith('sab')) return 6;
    return null;
};

const ConnectReportModal = ({ isOpen, onClose, connect, members = [], onSave, isAdmin, onViewMember }) => {
    const [reportDates, setReportDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [isCustomDate, setIsCustomDate] = useState(false);
    const [customDateValue, setCustomDateValue] = useState('');
    const [attendance, setAttendance] = useState({});
    const [guests, setGuests] = useState('');
    const [offering, setOffering] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Função para obter o nome conhecido dos membros com lógica de sobrenome para duplicatas
    const getMemberKnownName = (member, allConnectMembers) => {
        if (!member) return 'Membro não encontrado';

        const knownName = member.knownBy || member.name?.split(' ')[0] || member.name || 'Membro';

        const membersWithSameName = allConnectMembers.filter(m => {
            if (!m || m.id === member.id) return false;
            const otherKnownName = m.knownBy || m.name?.split(' ')[0] || m.name || 'Membro';
            return otherKnownName === knownName;
        });

        if (membersWithSameName.length > 0) {
            const nameParts = member.name?.split(' ') || [];
            const lastName = nameParts[nameParts.length - 1];
            return lastName && lastName !== knownName ? `${knownName} ${lastName}` : knownName;
        }

        return knownName;
    };

    // Membros que pertencem ao Connect
    const connectMembers = useMemo(() => {
        if (!connect) return [];

        const targetConnectId = String(connect.id || '');
        if (!targetConnectId) return [];

        const reportDateObj = selectedDate ? new Date(selectedDate + 'T12:00:00Z') : new Date();
        const reportDateNormalized = new Date(reportDateObj);
        reportDateNormalized.setHours(0, 0, 0, 0);

        return members.filter(member => {
            if (!member) return false;

            const isCurrentMember = String(member.connectId || '') === targetConnectId;

            // Se o membro está atualmente no Connect, sempre inclui para facilitar o lançamento
            if (isCurrentMember) {
                return true;
            }

            // Se não está atualmente no Connect, verifica se estava na data da reunião no histórico
            if (member.connectHistory && Array.isArray(member.connectHistory)) {
                return member.connectHistory.some(entry => {
                    if (String(entry.connectId || '') !== targetConnectId) return false;

                    const getNorm = (val) => {
                        if (!val) return null;
                        const d = val.toDate ? val.toDate() : new Date(val);
                        d.setHours(0, 0, 0, 0);
                        return isNaN(d.getTime()) ? null : d;
                    };

                    const startDate = getNorm(entry.startDate);
                    const endDate = getNorm(entry.endDate);

                    return (!startDate || reportDateNormalized >= startDate) &&
                           (!endDate || reportDateNormalized <= endDate);
                });
            }

            return false;
        }).sort((a, b) => {
            const nameA = getMemberKnownName(a, members);
            const nameB = getMemberKnownName(b, members);
            return nameA.localeCompare(nameB);
        });
    }, [members, connect, selectedDate]);

    // Geração das opções de datas de reunião
    useEffect(() => {
        if (!connect) return;

        const connectWeekday = getConnectWeekdayIndex(connect.weekday);
        const today = new Date();
        const todayWeekday = today.getDay();

        // Se o dia do Connect é conhecido, calcula o dia mais recente
        let baseDiff = 0;
        if (connectWeekday !== null) {
            baseDiff = todayWeekday - connectWeekday;
            if (baseDiff < 0) baseDiff += 7;
        }

        const dates = [];
        const labels = [
            'Semana Atual',
            'Semana Anterior',
            '2 semanas atrás',
            '3 semanas atrás'
        ];

        for (let i = 0; i < 4; i++) {
            const meetingDate = new Date(today);
            meetingDate.setDate(today.getDate() - baseDiff - (i * 7));
            const iso = meetingDate.toISOString().split('T')[0];
            dates.push({
                label: `${labels[i]} (${formatDateToBrazilian(meetingDate)})`,
                value: iso
            });
        }

        setReportDates(dates);
        if (dates.length > 0 && !selectedDate) {
            setSelectedDate(dates[0].value);
        }
        setIsCustomDate(false);
        setSaveError('');
    }, [connect]);

    // Busca o relatório existente quando a data ou connect mudam (sem resetar por re-renders de members!)
    useEffect(() => {
        if (!selectedDate || !connect?.id) return;
        let isCancelled = false;

        const fetchReport = async () => {
            setIsLoading(true);
            setSaveError('');
            try {
                const reportId = `${connect.id}_${selectedDate}`;
                const reportRef = doc(db, `artifacts/${getTenantId()}/public/data/connect_reports`, reportId);
                const reportSnap = await getDoc(reportRef);

                if (isCancelled) return;

                if (reportSnap.exists()) {
                    const data = reportSnap.data();
                    setAttendance(data.attendance || {});
                    setGuests(data.guests !== undefined && data.guests !== null ? data.guests.toString() : '');
                    setOffering(data.offering !== undefined && data.offering !== null ? data.offering.toString() : '');
                } else {
                    const initial = {};
                    connectMembers.forEach(m => { initial[m.id] = 'ausente'; });
                    setAttendance(initial);
                    setGuests('');
                    setOffering('');
                }
            } catch (err) {
                console.error("Erro ao carregar relatório:", err);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        fetchReport();

        return () => { isCancelled = true; };
    }, [selectedDate, connect?.id]);

    // Mescla novos membros na presença sem sobrescrever as escolhas do usuário
    useEffect(() => {
        if (!connectMembers || connectMembers.length === 0) return;
        setAttendance(prev => {
            let changed = false;
            const next = { ...prev };
            connectMembers.forEach(m => {
                if (!next[m.id]) {
                    next[m.id] = 'ausente';
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [connectMembers]);

    const handleAttendanceChange = (memberId, status) => {
        setAttendance(prev => ({ ...prev, [memberId]: status }));
    };

    const handleMarkAll = (status) => {
        setAttendance(prev => {
            const next = { ...prev };
            connectMembers.forEach(m => {
                next[m.id] = status;
            });
            return next;
        });
    };

    const handleDateSelectChange = (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            setIsCustomDate(true);
            if (!customDateValue) {
                const todayIso = new Date().toISOString().split('T')[0];
                setCustomDateValue(todayIso);
                setSelectedDate(todayIso);
            } else {
                setSelectedDate(customDateValue);
            }
        } else {
            setIsCustomDate(false);
            setSelectedDate(val);
        }
    };

    const handleCustomDateChange = (e) => {
        const val = e.target.value;
        setCustomDateValue(val);
        if (val) {
            setSelectedDate(val);
        }
    };

    const handleSave = async () => {
        if (!selectedDate) {
            setSaveError("Por favor, selecione uma data para a reunião.");
            return;
        }

        setIsSaving(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            // Garante que a presença tenha valores válidos para todos os membros
            const safeAttendance = {};
            connectMembers.forEach(m => {
                safeAttendance[m.id] = attendance[m.id] === 'presente' ? 'presente' : 'ausente';
            });

            // Resgata o nome do líder com fallback seguro
            const leaderMember = members.find(m => String(m.id) === String(connect.leaderId));
            const leaderName = connect.leaderName || leaderMember?.name || 'Não informado';
            const connectName = connect.name || (connect.number ? `Connect ${connect.number}` : 'Connect');

            const reportData = {
                connectId: String(connect.id),
                connectName: connectName,
                leaderId: connect.leaderId ? String(connect.leaderId) : (leaderMember?.id ? String(leaderMember.id) : ''),
                leaderName: leaderName,
                reportDate: new Date(selectedDate + 'T12:00:00Z'),
                guests: Math.max(0, parseInt(guests, 10) || 0),
                offering: Math.max(0, parseFloat(offering) || 0),
                attendance: safeAttendance
            };

            await onSave(reportData);
            setSaveSuccess(true);
            setTimeout(() => {
                onClose();
            }, 600);
        } catch (error) {
            console.error("Erro ao salvar relatório do Connect:", error);
            setSaveError(error?.message || 'Erro ao salvar relatório. Verifique sua conexão e tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const presentCount = connectMembers.filter(m => attendance[m.id] === 'presente').length;
    const totalCount = connectMembers.length;

    return (
        <Modal isOpen={isOpen} onClose={isSaving ? () => {} : onClose} size="2xl" title={`Relatório do Connect ${connect?.number || ''}`}>
            <div className="flex flex-col space-y-4">
                {/* Header e Seleção de Data */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <p className="font-semibold text-gray-800 text-base">{connect?.name || `Connect ${connect?.number || ''}`}</p>
                        {connect?.weekday && (
                            <span className="text-xs bg-red-100 text-[#DC2626] font-medium px-2 py-0.5 rounded-full">
                                {connect.weekday}
                            </span>
                        )}
                    </div>

                    <div>
                        <label htmlFor="reportDate" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
                            <Calendar size={14} className="text-gray-500" />
                            Data da Reunião
                        </label>
                        <select
                            id="reportDate"
                            value={isCustomDate ? 'custom' : selectedDate}
                            onChange={handleDateSelectChange}
                            disabled={isSaving}
                            className="w-full bg-white text-gray-900 rounded-md p-2 text-sm border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                        >
                            {reportDates.map(date => (
                                <option key={date.value} value={date.value}>{date.label}</option>
                            ))}
                            <option value="custom">📅 Outra Data (Personalizada)...</option>
                        </select>

                        {isCustomDate && (
                            <div className="mt-2">
                                <label className="block text-xs text-gray-600 mb-1">Informe a data específica:</label>
                                <input
                                    type="date"
                                    value={customDateValue}
                                    onChange={handleCustomDateChange}
                                    disabled={isSaving}
                                    className="w-full bg-white text-gray-900 rounded-md p-2 text-sm border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Banner de Feedback de Erro ou Sucesso */}
                {saveError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm flex items-start gap-2">
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Não foi possível salvar:</p>
                            <p>{saveError}</p>
                        </div>
                    </div>
                )}

                {saveSuccess && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded text-green-700 text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} className="flex-shrink-0" />
                        <p className="font-semibold">Relatório salvo com sucesso!</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="animate-spin text-[#DC2626]" size={32} />
                        <span className="text-sm">Carregando relatório e membros...</span>
                    </div>
                ) : (
                    <>
                        {/* Seção de Presença dos Membros */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-800 text-sm sm:text-base">Presença dos Membros</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                                        {presentCount} / {totalCount} presentes
                                    </span>
                                </div>
                                <div className="flex space-x-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => handleMarkAll('presente')}
                                        disabled={isSaving}
                                        className="text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded transition-colors font-medium"
                                    >
                                        Todos Presentes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMarkAll('ausente')}
                                        disabled={isSaving}
                                        className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded transition-colors font-medium"
                                    >
                                        Todos Ausentes
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                                {connectMembers.map(member => {
                                    const isPresent = attendance[member.id] === 'presente';
                                    return (
                                        <div
                                            key={member.id}
                                            className={`flex justify-between items-center p-2.5 rounded-lg border transition-all ${
                                                isPresent
                                                    ? 'bg-green-50/60 border-green-200'
                                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex-1 pr-2">
                                                <button
                                                    type="button"
                                                    className="text-left font-medium text-gray-800 hover:text-[#DC2626] hover:underline text-sm truncate block"
                                                    title="Ver cadastro"
                                                    onClick={() => onViewMember && onViewMember(member)}
                                                >
                                                    {getMemberKnownName(member, connectMembers)}
                                                </button>
                                            </div>
                                            <div className="flex space-x-1.5 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttendanceChange(member.id, 'presente')}
                                                    disabled={isSaving}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                                                        isPresent
                                                            ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-400'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-100'
                                                    }`}
                                                >
                                                    <CheckCircle2 size={13} />
                                                    <span>Presente</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttendanceChange(member.id, 'ausente')}
                                                    disabled={isSaving}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                                                        !isPresent
                                                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-100'
                                                    }`}
                                                >
                                                    <XCircle size={13} />
                                                    <span>Ausente</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {connectMembers.length === 0 && (
                                    <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-500 text-sm">
                                        Nenhum membro vinculado a este Connect.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informações Adicionais */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                            <p className="font-semibold text-gray-700 text-sm">Informações Adicionais</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="guests" className="block text-xs font-medium text-gray-700 mb-1">
                                        Nº de Convidados / Visitantes
                                    </label>
                                    <input
                                        type="number"
                                        id="guests"
                                        min="0"
                                        value={guests}
                                        onChange={e => setGuests(e.target.value)}
                                        disabled={isSaving}
                                        className="w-full bg-white text-gray-900 rounded-md p-2 text-sm border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="offering" className="block text-xs font-medium text-gray-700 mb-1">
                                        Valor da Oferta (R$)
                                    </label>
                                    <input
                                        type="number"
                                        id="offering"
                                        min="0"
                                        step="0.01"
                                        value={offering}
                                        onChange={e => setOffering(e.target.value)}
                                        disabled={isSaving}
                                        className="w-full bg-white text-gray-900 rounded-md p-2 text-sm border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`px-5 py-2 rounded-md text-sm font-semibold text-white transition-all flex items-center justify-center space-x-2 ${
                                    isSaving
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : saveSuccess
                                            ? 'bg-green-600'
                                            : 'bg-[#DC2626] hover:bg-[#991B1B] shadow-sm'
                                }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>Salvando...</span>
                                    </>
                                ) : saveSuccess ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>Salvo!</span>
                                    </>
                                ) : (
                                    <span>Salvar Relatório</span>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ConnectReportModal;
