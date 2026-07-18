import React, { useState, useEffect } from 'react';
import { Award, Download, Check, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const CertificateGenerationTab = ({ course, attendanceRecords, visibleStudentsInModal, allCertificateTemplates }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [approvedStudents, setApprovedStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        // Find approved students based on freq and grade
        const validRecords = attendanceRecords.filter(r => !r.ignoreAttendance && !r.noClass);
        const approved = visibleStudentsInModal.filter(student => {
            let presentCount = 0;
            validRecords.forEach(r => {
                if (r.statuses?.[student.id] === 'presente') presentCount++;
            });
            const freq = validRecords.length > 0 ? (presentCount / validRecords.length) * 100 : 0;
            
            let totalGrade = 0;
            ['tests', 'activities', 'assignments'].forEach(type => {
                const typeData = course.assessment?.[type];
                const typeScores = student.scores?.[type] || [];
                const count = typeData?.count || 0;
                for (let i = 0; i < count; i++) {
                    totalGrade += Number(typeScores[i] || 0);
                }
            });

            if (course.passingCriteria) {
                return freq >= course.passingCriteria.minAttendance && totalGrade >= course.passingCriteria.minGrade;
            }
            return true; // if no criteria, everyone passes by default
        });

        setApprovedStudents(approved);
        setSelectedStudentIds(new Set(approved.map(s => s.id)));
    }, [course, attendanceRecords, visibleStudentsInModal]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedStudentIds(new Set(approvedStudents.map(s => s.id)));
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    const handleSelectStudent = (id) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudentIds(newSet);
    };

    const generateCertificates = async () => {
        if (!selectedTemplateId) {
            alert("Selecione um modelo de certificado.");
            return;
        }
        
        const template = allCertificateTemplates?.find(t => t.id === selectedTemplateId);
        if (!template || !template.backgroundImage) {
            alert("O modelo selecionado não possui imagem de fundo.");
            return;
        }

        const studentsToGenerate = approvedStudents.filter(s => selectedStudentIds.has(s.id));
        if (studentsToGenerate.length === 0) {
            alert("Selecione pelo menos um aluno para gerar o certificado.");
            return;
        }

        setGenerating(true);
        const zip = new JSZip();
        
        // Crie um container oculto para renderizar
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '1123px';
        container.style.height = '794px';
        document.body.appendChild(container);

        try {
            for (const student of studentsToGenerate) {
                // Monta o DOM do certificado para este aluno
                container.innerHTML = '';
                
                const img = document.createElement('img');
                img.src = template.backgroundImage;
                img.crossOrigin = "Anonymous"; // Importante para evitar CORS no canvas se for Firebase
                img.style.position = 'absolute';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                container.appendChild(img);

                // Aguarda a imagem carregar
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn("Falha ao carregar imagem, tentando prosseguir...");
                        resolve();
                    };
                });

                // Adiciona as caixas de texto substituindo os placeholders
                (template.textBoxes || []).forEach(box => {
                    let text = box.text || '';
                    text = text.replace(/\[NomeAluno\]/g, student.name || student.email || '');
                    text = text.replace(/\[NomeCurso\]/g, course.name || '');
                    
                    const [year, month, day] = issueDate.split('-');
                    text = text.replace(/\[Data\]/g, `${day}/${month}/${year}`);
                    
                    text = text.replace(/\[CargaHoraria\]/g, course.duration || '');
                    text = text.replace(/\[Professor\]/g, course.teacherName || '');

                    const div = document.createElement('div');
                    div.innerText = text;
                    div.style.position = 'absolute';
                    div.style.left = `${box.x}%`;
                    div.style.top = `${box.y}%`;
                    div.style.fontSize = `${box.fontSize}px`;
                    div.style.color = box.color;
                    div.style.textAlign = box.align;
                    div.style.fontWeight = box.fontWeight;
                    div.style.fontFamily = box.fontFamily || 'sans-serif';
                    div.style.whiteSpace = 'pre-wrap';
                    div.style.minWidth = '200px'; // previne que o texto quebre mal se n tiver width fixa
                    
                    container.appendChild(div);
                });

                // Renderiza
                const canvas = await html2canvas(container, {
                    scale: 2, // Maior qualidade
                    useCORS: true,
                    allowTaint: true,
                    logging: false
                });

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                zip.file(`Certificado_${student.name || 'Aluno'}.jpg`, blob);
            }

            // Gerar ZIP e baixar
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `Certificados_${course.name}.zip`);

        } catch (error) {
            console.error("Erro ao gerar certificados:", error);
            alert("Ocorreu um erro ao gerar os certificados.");
        } finally {
            document.body.removeChild(container);
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Award className="mr-2 text-[#1e40af]" size={24}/> Emissão de Certificados
                </h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Certificado</label>
                        <select 
                            value={selectedTemplateId} 
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="">Selecione um modelo...</option>
                            {allCertificateTemplates?.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão</label>
                        <input 
                            type="date" 
                            value={issueDate}
                            onChange={e => setIssueDate(e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            checked={selectedStudentIds.size === approvedStudents.length && approvedStudents.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Selecionar Todos ({approvedStudents.length} Aprovados)</span>
                    </div>
                    <span className="text-xs text-gray-500">{selectedStudentIds.size} selecionado(s)</span>
                </div>
                <ul className="flex-1 overflow-y-auto divide-y divide-gray-200">
                    {approvedStudents.map(student => (
                        <li key={student.id} className="p-3 hover:bg-gray-50 flex items-center cursor-pointer" onClick={() => handleSelectStudent(student.id)}>
                            <input 
                                type="checkbox" 
                                checked={selectedStudentIds.has(student.id)}
                                readOnly
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                                <p className="text-xs text-gray-500 truncate">{student.email}</p>
                            </div>
                            <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Aprovado
                                </span>
                            </div>
                        </li>
                    ))}
                    {approvedStudents.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum aluno atingiu os critérios de aprovação nesta turma.
                        </div>
                    )}
                </ul>
            </div>

            <div className="flex-shrink-0 pt-4 flex justify-end">
                <button
                    onClick={generateCertificates}
                    disabled={generating || selectedStudentIds.size === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1e40af] hover:bg-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {generating ? (
                        <>Gerando ({selectedStudentIds.size})...</>
                    ) : (
                        <><Download className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" /> Gerar {selectedStudentIds.size} Certificados (ZIP)</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CertificateGenerationTab;
