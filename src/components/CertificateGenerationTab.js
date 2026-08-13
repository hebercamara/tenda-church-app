import React, { useState, useEffect } from 'react';
import { Award, Download, Check, X, FileImage, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

const CertificateGenerationTab = ({ course, attendanceRecords, visibleStudentsInModal, allCertificateTemplates, calculateFinalGrade, calculateAttendancePercentage }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [approvedStudents, setApprovedStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
    const [generating, setGenerating] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf' or 'zip'

    useEffect(() => {
        // Find approved students based on freq and grade
        const approved = visibleStudentsInModal.filter(student => {
            const freq = calculateAttendancePercentage ? calculateAttendancePercentage(student.id) : 0;
            const totalGrade = calculateFinalGrade ? calculateFinalGrade(student) : 0;

            if (course.passingCriteria) {
                return freq >= course.passingCriteria.minAttendance && totalGrade >= course.passingCriteria.minGrade;
            }
            return true; // if no criteria, everyone passes by default
        });

        setApprovedStudents(approved);
        setSelectedStudentIds(new Set(approved.map(s => s.id)));
    }, [course, attendanceRecords, visibleStudentsInModal, calculateAttendancePercentage, calculateFinalGrade]);

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
        let pdf = null;
        
        if (exportFormat === 'pdf') {
            pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1123, 794]
            });
        }
        
        // Crie um container oculto para renderizar
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '1123px';
        container.style.height = '794px';
        document.body.appendChild(container);

        try {
            let isFirstPage = true;
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
                    // We set top and left to 0, then use transform to move it, just like react-draggable does
                    div.style.top = '0px';
                    div.style.left = '0px';
                    const xPx = (box.x / 100) * 1123;
                    const yPx = (box.y / 100) * 794;
                    div.style.transform = `translate(${xPx}px, ${yPx}px)`;
                    
                    if (box.fullWidth) {
                        div.style.width = '100%';
                    } else {
                        div.style.width = 'auto';
                        div.style.minWidth = '200px';
                    }
                    div.style.fontSize = `${box.fontSize}px`;
                    div.style.color = box.color;
                    div.style.textAlign = box.align;
                    div.style.fontWeight = box.fontWeight;
                    div.style.fontFamily = box.fontFamily || 'sans-serif';
                    div.style.whiteSpace = 'pre-wrap';
                    div.style.lineHeight = '1.25'; // matches 'leading-tight' in the editor
                    div.style.display = 'inline-block'; // matches 'inline-block' in the editor
                    
                    container.appendChild(div);
                });

                // Renderiza
                const canvas = await html2canvas(container, {
                    scale: 2, // Maior qualidade
                    useCORS: true,
                    allowTaint: true,
                    logging: false
                });

                if (exportFormat === 'pdf') {
                    if (!isFirstPage) {
                        pdf.addPage();
                    }
                    const imgData = canvas.toDataURL('image/jpeg', 0.9);
                    pdf.addImage(imgData, 'JPEG', 0, 0, 1123, 794);
                    isFirstPage = false;
                } else {
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                    zip.file(`Certificado_${student.name || 'Aluno'}.jpg`, blob);
                }
            }

            if (exportFormat === 'pdf') {
                pdf.save(`Certificados_${course.name}.pdf`);
            } else {
                // Gerar ZIP e baixar
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, `Certificados_${course.name}.zip`);
            }

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

            <div className="flex-shrink-0 p-4 border-t border-gray-200 flex justify-end items-center gap-4">
                <div className="flex items-center gap-2 mr-auto">
                    <button
                        onClick={() => setExportFormat('pdf')}
                        className={`flex items-center px-3 py-1.5 rounded text-sm font-medium border ${exportFormat === 'pdf' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <FileText className="w-4 h-4 mr-1.5" />
                        PDF Único
                    </button>
                    <button
                        onClick={() => setExportFormat('zip')}
                        className={`flex items-center px-3 py-1.5 rounded text-sm font-medium border ${exportFormat === 'zip' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <FileImage className="w-4 h-4 mr-1.5" />
                        ZIP (Imagens)
                    </button>
                </div>
                <button
                    onClick={generateCertificates}
                    disabled={generating || selectedStudentIds.size === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1e40af] hover:bg-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {generating ? (
                        <>Gerando ({selectedStudentIds.size})...</>
                    ) : (
                        <><Download className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" /> Gerar {selectedStudentIds.size} Certificados ({exportFormat === 'pdf' ? 'PDF' : 'ZIP'})</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CertificateGenerationTab;
