import React, { useState, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, Copy, ArrowRight, UserCheck, ChevronDown, X, Mail, Phone, Calendar } from 'lucide-react';
import Modal from './Modal';
import LoadingButton from './LoadingButton';

// Definição dos campos extras disponíveis
const EXTRA_FIELD_OPTIONS = [
    { key: 'email',    label: 'E-mail',             icon: Mail,     placeholder: 'ex: joao@email.com',    type: 'email' },
    { key: 'phone',    label: 'Celular',             icon: Phone,    placeholder: 'ex: (11) 99999-0000',   type: 'tel' },
    { key: 'dob',      label: 'Data de Nascimento',  icon: Calendar, placeholder: 'ex: 15/06/1990',        type: 'text' },
];

const emptyRow = (extraFields = []) => {
    const base = { id: Date.now().toString() + Math.random(), name: '', lastName: '' };
    extraFields.forEach(f => { base[f.key] = ''; });
    return base;
};

const BatchSimpleMemberModal = ({ isOpen, onClose, onSave, onSaveAndEnroll, allMembers, allSimpleMembers, areNamesSimilar }) => {
    const [rows, setRows] = useState([{ id: '1', name: '', lastName: '' }]);
    const [extraFields, setExtraFields] = useState([]); // campos extras ativos
    const [showFieldMenu, setShowFieldMenu] = useState(false);
    const fieldMenuRef = useRef(null);

    const [pasteText, setPasteText] = useState('');
    const [step, setStep] = useState('edit');
    const [conflicts, setConflicts] = useState([]);
    const [conflictResolutions, setConflictResolutions] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    // ── Gerenciamento de campos extras ────────────────────────────────────────
    const handleAddField = (field) => {
        if (extraFields.find(f => f.key === field.key)) return; // já existe
        const newFields = [...extraFields, field];
        setExtraFields(newFields);
        // Adicionar a chave vazia em todas as linhas existentes
        setRows(prev => prev.map(r => ({ ...r, [field.key]: r[field.key] || '' })));
        setShowFieldMenu(false);
    };

    const handleRemoveField = (fieldKey) => {
        setExtraFields(prev => prev.filter(f => f.key !== fieldKey));
        setRows(prev => prev.map(r => {
            const { [fieldKey]: _, ...rest } = r;
            return rest;
        }));
    };

    // ── Gerenciamento de linhas ───────────────────────────────────────────────
    const handleAddRow = () => {
        setRows(prev => [...prev, emptyRow(extraFields)]);
    };

    const handleRemoveRow = (id) => {
        if (rows.length === 1) {
            setRows([emptyRow(extraFields)]);
        } else {
            setRows(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleCellChange = (id, field, value) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // ── Paste inteligente ─────────────────────────────────────────────────────
    // Ordem das colunas: Nome, Sobrenome, [campo extra 1, campo extra 2, ...]
    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        processPasteText(text);
    };

    const processPasteText = (text) => {
        if (!text.trim()) return;
        const allColumns = ['name', 'lastName', ...extraFields.map(f => f.key)];
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const newRows = lines.map((line, idx) => {
            const cols = line.split('\t');
            const row = { id: (Date.now() + idx).toString() + Math.random() };
            allColumns.forEach((col, i) => {
                row[col] = cols[i]?.trim() || '';
            });
            // Se houver mais colunas do que as esperadas, os extras são descartados silenciosamente
            return row;
        });

        if (rows.length === 1 && !rows[0].name.trim() && !rows[0].lastName.trim()) {
            setRows(newRows);
        } else {
            setRows(prev => [...prev, ...newRows]);
        }
        setPasteText('');
    };

    const handleClearAll = () => {
        setRows([emptyRow(extraFields)]);
        setError('');
    };

    // ── Validação e verificação de duplicatas ─────────────────────────────────
    const handleProcess = () => {
        setError('');

        const validRows = rows.filter(r => r.name.trim() || r.lastName.trim());
        if (validRows.length === 0) {
            setError('Preencha pelo menos um aluno na tabela.');
            return;
        }

        const incomplete = validRows.some(r => !r.name.trim() || !r.lastName.trim());
        if (incomplete) {
            setError('Nome e Sobrenome são obrigatórios em todas as linhas preenchidas.');
            return;
        }

        const SIMILARITY_THRESHOLD = 0.8;
        const detectedConflicts = [];
        const initialResolutions = {};

        validRows.forEach((row, index) => {
            const fullName = `${row.name} ${row.lastName}`.trim();
            const rowEmail = (row.email || '').trim().toLowerCase();
            const matches = [];
            const seenIds = new Set();

            // 1. Match por e-mail (prioridade máxima — certeza de duplicata)
            if (rowEmail) {
                (Array.isArray(allMembers) ? allMembers : []).forEach(m => {
                    if (!m || seenIds.has(m.id)) return;
                    if (m.email && m.email.toLowerCase() === rowEmail) {
                        seenIds.add(m.id);
                        matches.unshift({ id: m.id, name: m.name, type: 'Membro Completo ✓ E-mail igual', email: m.email, exactEmail: true });
                    }
                });
                (Array.isArray(allSimpleMembers) ? allSimpleMembers : []).forEach(sm => {
                    if (!sm || seenIds.has(sm.id)) return;
                    if (sm.email && sm.email.toLowerCase() === rowEmail) {
                        seenIds.add(sm.id);
                        const smFullName = sm.lastName ? `${sm.name} ${sm.lastName}` : sm.name;
                        matches.unshift({ id: sm.id, name: smFullName, type: 'Cadastro Simples ✓ E-mail igual', email: sm.email, exactEmail: true });
                    }
                });
            }

            // 2. Match por nome semelhante
            (Array.isArray(allMembers) ? allMembers : []).forEach(m => {
                if (!m || seenIds.has(m.id)) return;
                if (m.name && areNamesSimilar && areNamesSimilar(fullName, m.name, SIMILARITY_THRESHOLD)) {
                    seenIds.add(m.id);
                    matches.push({ id: m.id, name: m.name, type: 'Membro Completo', email: m.email || 'Sem e-mail' });
                }
            });

            (Array.isArray(allSimpleMembers) ? allSimpleMembers : []).forEach(sm => {
                if (!sm || seenIds.has(sm.id)) return;
                const smFullName = sm.lastName ? `${sm.name} ${sm.lastName}` : sm.name;
                if (smFullName && areNamesSimilar && areNamesSimilar(fullName, smFullName, SIMILARITY_THRESHOLD)) {
                    seenIds.add(sm.id);
                    matches.push({ id: sm.id, name: smFullName, type: 'Cadastro Simples', email: sm.email || 'Somente Curso' });
                }
            });

            if (matches.length > 0) {
                detectedConflicts.push({ rowIndex: index, rowData: row, matches });
                // Se há match exato de e-mail, pré-seleciona unificação
                initialResolutions[index] = {
                    action: 'unify',
                    targetId: matches[0].id,
                    targetName: matches[0].name
                };
            } else {
                initialResolutions[index] = { action: 'create' };
            }
        });

        if (detectedConflicts.length > 0) {
            setConflicts(detectedConflicts);
            setConflictResolutions(initialResolutions);
            setStep('conflict');
        } else {
            saveAll(validRows, initialResolutions);
        }
    };

    // ── Salvamento ────────────────────────────────────────────────────────────
    const saveAll = async (validRows, resolutions) => {
        setIsLoading(true);
        setError('');
        try {
            const enrolledMemberIds = [];

            for (let i = 0; i < validRows.length; i++) {
                const row = validRows[i];
                const resolution = resolutions[i];

                if (resolution && resolution.action === 'unify') {
                    enrolledMemberIds.push(resolution.targetId);
                } else {
                    // Monta objeto apenas com os campos preenchidos
                    const simpleMemberData = {
                        name: row.name.trim(),
                        lastName: row.lastName.trim(),
                        createdAt: new Date().toISOString()
                    };
                    // Adiciona campos extras se preenchidos
                    extraFields.forEach(f => {
                        const val = (row[f.key] || '').trim();
                        if (val) simpleMemberData[f.key] = val;
                    });

                    const newRef = await onSave(simpleMemberData);
                    if (newRef && newRef.id) {
                        enrolledMemberIds.push(newRef.id);
                    }
                }
            }

            if (onSaveAndEnroll) {
                await onSaveAndEnroll(enrolledMemberIds);
            }

            handleClose();
        } catch (err) {
            console.error(err);
            setError('Erro ao salvar os cadastros. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmConflicts = () => {
        const validRows = rows.filter(r => r.name.trim() || r.lastName.trim());
        saveAll(validRows, conflictResolutions);
    };

    const handleClose = () => {
        setRows([{ id: '1', name: '', lastName: '' }]);
        setExtraFields([]);
        setStep('edit');
        setConflicts([]);
        setConflictResolutions({});
        setError('');
        onClose();
    };

    // Campos disponíveis para adicionar (exclui os já adicionados)
    const availableFields = EXTRA_FIELD_OPTIONS.filter(f => !extraFields.find(ef => ef.key === f.key));

    // Hint de ordem para colagem
    const columnOrder = ['Nome', 'Sobrenome', ...extraFields.map(f => f.label)];

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="5xl"
            title={step === 'edit' ? 'Cadastro Simplificado em Lote (Excel)' : 'Verificação Cruzada de Duplicidades'}
        >
            <div className="p-1 space-y-4">
                {error && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {step === 'edit' ? (
                    <div className="space-y-4">

                        {/* Instrução dinâmica de ordem de colunas */}
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span>Ordem das colunas para colar:</span>
                            {columnOrder.map((col, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 rounded px-2 py-0.5 text-xs font-semibold text-gray-700">
                                    <span className="text-gray-400">{i + 1}.</span> {col}
                                    {i < 2 && <span className="text-red-500 ml-0.5">*</span>}
                                </span>
                            ))}
                            {availableFields.length > 0 && (
                                <span className="text-gray-400 text-xs italic">+ adicione mais campos abaixo</span>
                            )}
                        </div>

                        {/* Área de colagem */}
                        <div className="relative">
                            <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                onPaste={handlePaste}
                                placeholder="Clique aqui e pressione Ctrl+V para colar dados de uma planilha Excel..."
                                className="w-full h-14 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-600 focus:outline-none focus:border-[#DC2626] transition-colors resize-none"
                            />
                            {pasteText && (
                                <button
                                    onClick={() => processPasteText(pasteText)}
                                    className="absolute right-2 bottom-2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md hover:bg-black font-semibold flex items-center gap-1"
                                >
                                    <Copy size={12} />
                                    <span>Processar</span>
                                </button>
                            )}
                        </div>

                        {/* Tabela */}
                        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                            <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 border-b z-10">
                                        <tr>
                                            <th className="p-3 w-10 text-center text-gray-400">#</th>
                                            <th className="p-3 min-w-[130px]">Nome <span className="text-red-500">*</span></th>
                                            <th className="p-3 min-w-[130px]">Sobrenome <span className="text-red-500">*</span></th>
                                            {/* Colunas extras dinâmicas */}
                                            {extraFields.map(field => {
                                                const Icon = field.icon;
                                                return (
                                                    <th key={field.key} className="p-3 min-w-[160px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Icon size={12} className="text-gray-400" />
                                                            <span>{field.label}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveField(field.key)}
                                                                className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                                                                title={`Remover coluna ${field.label}`}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                            {/* Botão adicionar coluna no cabeçalho */}
                                            {availableFields.length > 0 && (
                                                <th className="p-2 w-10 relative" ref={fieldMenuRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowFieldMenu(v => !v)}
                                                        className="flex items-center gap-1 text-[#DC2626] hover:text-[#991B1B] font-bold text-xs whitespace-nowrap border border-dashed border-[#DC2626] rounded px-2 py-1 transition-colors"
                                                        title="Adicionar campo"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Campo</span>
                                                        <ChevronDown size={11} />
                                                    </button>
                                                    {showFieldMenu && (
                                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-1">
                                                            {availableFields.map(f => {
                                                                const Icon = f.icon;
                                                                return (
                                                                    <button
                                                                        key={f.key}
                                                                        type="button"
                                                                        onClick={() => handleAddField(f)}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#DC2626] transition-colors text-left"
                                                                    >
                                                                        <Icon size={15} className="text-gray-400" />
                                                                        {f.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </th>
                                            )}
                                            <th className="p-3 w-12 text-center">⚙</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rows.map((row, index) => (
                                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 text-center text-gray-400 text-xs font-semibold">{index + 1}</td>
                                                {/* Nome */}
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={row.name}
                                                        onChange={(e) => handleCellChange(row.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#DC2626] focus:outline-none p-1 text-gray-800"
                                                        placeholder="Ex: Carlos"
                                                    />
                                                </td>
                                                {/* Sobrenome */}
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={row.lastName}
                                                        onChange={(e) => handleCellChange(row.id, 'lastName', e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#DC2626] focus:outline-none p-1 text-gray-800"
                                                        placeholder="Ex: Santana"
                                                    />
                                                </td>
                                                {/* Campos extras */}
                                                {extraFields.map(field => (
                                                    <td key={field.key} className="p-2">
                                                        <input
                                                            type={field.type}
                                                            value={row[field.key] || ''}
                                                            onChange={(e) => handleCellChange(row.id, field.key, e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#DC2626] focus:outline-none p-1 text-gray-800"
                                                            placeholder={field.placeholder}
                                                        />
                                                    </td>
                                                ))}
                                                {/* Espaço vazio para o botão de adicionar campo */}
                                                {availableFields.length > 0 && <td />}
                                                {/* Excluir linha */}
                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRow(row.id)}
                                                        className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors"
                                                        title="Remover linha"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex justify-between items-center pt-1">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md font-semibold text-xs flex items-center gap-1.5"
                                >
                                    <Plus size={14} />
                                    <span>Linha</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="px-3.5 py-1.5 border border-gray-300 text-gray-500 hover:text-red-600 rounded-md font-semibold text-xs"
                                >
                                    Limpar Tudo
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 border rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProcess}
                                    className="px-5 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white font-semibold rounded-md text-sm shadow flex items-center gap-1.5"
                                >
                                    <span>Verificar e Salvar</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                ) : (
                    // ── Painel de Conflitos ───────────────────────────────────
                    <div className="space-y-4">
                        <div className="flex items-center text-orange-600 bg-orange-50 border border-orange-200 p-3 rounded-lg gap-2.5">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-xs font-semibold">
                                Encontramos cadastros existentes semelhantes. Decida se deseja unificar (une o histórico) ou criar um novo registro separado.
                            </p>
                        </div>

                        <div className="border rounded-lg overflow-hidden bg-white max-h-[360px] overflow-y-auto">
                            <div className="divide-y divide-gray-200">
                                {conflicts.map(conflict => {
                                    const { rowIndex, rowData, matches } = conflict;
                                    const resolution = conflictResolutions[rowIndex] || { action: 'create' };
                                    const fullName = `${rowData.name} ${rowData.lastName}`;

                                    return (
                                        <div key={rowIndex} className="p-4 flex flex-col md:flex-row md:items-start gap-4 justify-between bg-gray-50 hover:bg-white transition-colors">
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <span className="text-[10px] font-bold text-red-600 uppercase">Linha {rowIndex + 1}</span>
                                                <h4 className="font-bold text-gray-800 text-base">{fullName}</h4>
                                                {rowData.email && <p className="text-xs text-gray-500">📧 {rowData.email}</p>}
                                                {rowData.phone && <p className="text-xs text-gray-500">📱 {rowData.phone}</p>}
                                            </div>

                                            <div className="flex-1 space-y-2 min-w-0">
                                                <span className="text-[10px] font-bold text-orange-600 uppercase">Possíveis Duplicados</span>
                                                <div className="space-y-2">
                                                    {matches.map(match => (
                                                        <label key={match.id} className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-xs transition-colors ${match.exactEmail ? 'bg-green-50 border-green-300 hover:shadow-sm' : 'bg-white hover:shadow-sm'}`}>
                                                            <input
                                                                type="radio"
                                                                name={`conflict-${rowIndex}`}
                                                                checked={resolution.action === 'unify' && resolution.targetId === match.id}
                                                                onChange={() => setConflictResolutions(prev => ({
                                                                    ...prev,
                                                                    [rowIndex]: { action: 'unify', targetId: match.id, targetName: match.name }
                                                                }))}
                                                                className="mt-0.5 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                                                            />
                                                            <div className="space-y-0.5 min-w-0">
                                                                <p className="font-bold text-gray-800 truncate">{match.name}</p>
                                                                <p className="text-[10px] text-gray-500 truncate">{match.type} • {match.email}</p>
                                                                {match.exactEmail && (
                                                                    <p className="text-[10px] text-green-700 font-semibold">✓ E-mail idêntico — alta confiança</p>
                                                                )}
                                                            </div>
                                                        </label>
                                                    ))}

                                                    <label className="flex items-center gap-2 bg-white p-2 rounded border hover:shadow-sm cursor-pointer text-xs">
                                                        <input
                                                            type="radio"
                                                            name={`conflict-${rowIndex}`}
                                                            checked={resolution.action === 'create'}
                                                            onChange={() => setConflictResolutions(prev => ({
                                                                ...prev,
                                                                [rowIndex]: { action: 'create' }
                                                            }))}
                                                            className="text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                                                        />
                                                        <span className="font-bold text-gray-600">Não, criar novo cadastro separado</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <button
                                type="button"
                                onClick={() => setStep('edit')}
                                className="px-4 py-2 border rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                ← Voltar para Tabela
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 border rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <LoadingButton
                                    onClick={handleConfirmConflicts}
                                    isLoading={isLoading}
                                    className="px-5 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white font-semibold rounded-md text-sm shadow flex items-center gap-1.5"
                                >
                                    <UserCheck size={18} />
                                    <span>Confirmar e Salvar</span>
                                </LoadingButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BatchSimpleMemberModal;
