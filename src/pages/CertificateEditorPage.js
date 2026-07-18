import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, Type } from 'lucide-react';
import Draggable from 'react-draggable';

const FONT_OPTIONS = [
    { label: 'Padrão (Inter)', value: 'Inter, sans-serif' },
    { label: 'Elegante (Playfair)', value: '"Playfair Display", serif' },
    { label: 'Clássica (Merriweather)', value: 'Merriweather, serif' },
    { label: 'Caligráfica (Great Vibes)', value: '"Great Vibes", cursive' },
    { label: 'Assinatura (Alex Brush)', value: '"Alex Brush", cursive' },
    { label: 'Escrita à mão (Dancing Script)', value: '"Dancing Script", cursive' },
    { label: 'Moderna (Montserrat)', value: 'Montserrat, sans-serif' },
    { label: 'Séria (Roboto)', value: 'Roboto, sans-serif' }
];

const CertificateEditorPage = ({ loadingStates }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [template, setTemplate] = useState({
        name: 'Novo Modelo de Certificado',
        backgroundImage: '',
        textBoxes: []
    });
    const [selectedBoxId, setSelectedBoxId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [scale, setScale] = useState(0.7);

    // Ajustar escala para caber na tela
    useEffect(() => {
        const updateScale = () => {
            if (!wrapperRef.current) return;
            const { width, height } = wrapperRef.current.getBoundingClientRect();
            // A4 is 1123x794. Adding some padding (-40)
            const scaleX = (width - 40) / 1123;
            const scaleY = (height - 40) / 794;
            const newScale = Math.min(scaleX, scaleY, 1);
            setScale(newScale);
        };
        
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => {
        const fetchTemplate = async () => {
            if (id === 'new') return;
            loadingStates.setLoading('fetchCertTemplate', 'Carregando modelo...');
            try {
                const docRef = doc(db, `artifacts/${appId}/public/data/certificate_templates`, id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTemplate({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Erro ao carregar modelo:", error);
            } finally {
                loadingStates.setIdle('fetchCertTemplate');
            }
        };
        fetchTemplate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Reduzir resolução para evitar limite de 1MB do Firestore
                const MAX_WIDTH = 1200;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Comprimir como JPEG 70% qualidade
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                setTemplate(prev => ({ ...prev, backgroundImage: base64String }));
                setUploading(false);
            };
            img.src = event.target.result;
        };
        reader.onerror = () => {
            console.error("Erro ao ler arquivo");
            setUploading(false);
            alert("Erro ao processar imagem.");
        };
        reader.readAsDataURL(file);
    };

    const handleAddTextBox = () => {
        const newBox = {
            id: Date.now().toString(),
            text: '[NomeAluno]',
            x: 50, // %
            y: 50, // %
            fontSize: 24,
            color: '#000000',
            align: 'center',
            fontWeight: 'bold',
            fontFamily: 'sans-serif'
        };
        setTemplate(prev => ({
            ...prev,
            textBoxes: [...(prev.textBoxes || []), newBox]
        }));
        setSelectedBoxId(newBox.id);
    };

    const handleUpdateTextBox = (boxId, updates) => {
        setTemplate(prev => ({
            ...prev,
            textBoxes: prev.textBoxes.map(b => b.id === boxId ? { ...b, ...updates } : b)
        }));
    };

    const handleDeleteTextBox = (boxId) => {
        setTemplate(prev => ({
            ...prev,
            textBoxes: prev.textBoxes.filter(b => b.id !== boxId)
        }));
        if (selectedBoxId === boxId) setSelectedBoxId(null);
    };

    const handleDragStop = (boxId, e, data) => {
        // data.x e data.y já estão na escala real (0 a 1123, 0 a 794) graças ao scale do Draggable
        const xPercent = (data.x / 1123) * 100;
        const yPercent = (data.y / 794) * 100;
        
        handleUpdateTextBox(boxId, { x: xPercent, y: yPercent });
    };

    const handleSave = async () => {
        if (!template.name || !template.backgroundImage) {
            alert('Dê um nome ao modelo e envie uma imagem de fundo antes de salvar.');
            return;
        }

        loadingStates.setLoading('saveCertTemplate', 'Salvando modelo...');
        try {
            const collectionPath = `artifacts/${appId}/public/data/certificate_templates`;
            if (id === 'new') {
                await addDoc(collection(db, collectionPath), template);
            } else {
                await setDoc(doc(db, collectionPath, id), template);
            }
            navigate('/cursos');
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar o modelo.");
        } finally {
            loadingStates.setIdle('saveCertTemplate');
        }
    };

    const selectedBox = template.textBoxes?.find(b => b.id === selectedBoxId);

    const placeholders = ['[NomeAluno]', '[NomeCurso]', '[Data]', '[CargaHoraria]', '[Professor]'];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <button onClick={() => navigate('/cursos')} className="mr-4 text-gray-500 hover:text-gray-700">
                        <ArrowLeft size={24} />
                    </button>
                    <input 
                        type="text" 
                        value={template.name}
                        onChange={(e) => setTemplate({...template, name: e.target.value})}
                        className="text-2xl font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-red-500 focus:outline-none px-2 py-1 rounded"
                    />
                </div>
                <button 
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"
                >
                    <Save size={20} />
                    <span>Salvar Modelo</span>
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Lateral de Controles */}
                <div className="w-80 bg-white rounded-lg shadow-sm border p-4 flex flex-col overflow-y-auto">
                    <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Configurações Base</h3>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de Fundo (A4 Paisagem ideal)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative overflow-hidden">
                            {template.backgroundImage ? (
                                <div className="absolute inset-0">
                                    <img src={template.backgroundImage} alt="Fundo" className="w-full h-full object-cover opacity-30" />
                                </div>
                            ) : null}
                            <div className="space-y-1 text-center relative z-10">
                                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none">
                                        <span>{uploading ? 'Enviando...' : 'Fazer Upload'}</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                        <h3 className="font-semibold text-gray-700">Textos Mágicos</h3>
                        <button onClick={handleAddTextBox} className="text-sm bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded flex items-center">
                            <Plus size={16} className="mr-1"/> Add Texto
                        </button>
                    </div>

                    {selectedBox ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Conteúdo (Use as tags abaixo ou texto fixo)</label>
                                <textarea 
                                    className="w-full border rounded p-2 text-sm"
                                    rows="3"
                                    value={selectedBox.text}
                                    onChange={(e) => handleUpdateTextBox(selectedBox.id, { text: e.target.value })}
                                />
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {placeholders.map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => handleUpdateTextBox(selectedBox.id, { text: selectedBox.text + ' ' + p })}
                                            className="text-[10px] bg-gray-200 hover:bg-gray-300 rounded px-1.5 py-0.5"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tamanho da Fonte (px)</label>
                                    <input type="number" value={selectedBox.fontSize} onChange={(e) => handleUpdateTextBox(selectedBox.id, { fontSize: Number(e.target.value) })} className="w-full border rounded p-1 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Cor</label>
                                    <input type="color" value={selectedBox.color} onChange={(e) => handleUpdateTextBox(selectedBox.id, { color: e.target.value })} className="w-full h-8 border rounded p-0 cursor-pointer"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fonte</label>
                                <select 
                                    className="w-full border rounded p-1 text-sm"
                                    value={selectedBox.fontFamily || 'Inter, sans-serif'}
                                    onChange={(e) => handleUpdateTextBox(selectedBox.id, { fontFamily: e.target.value })}
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Alinhamento</label>
                                    <div className="flex border rounded overflow-hidden">
                                        {['left', 'center', 'right'].map(align => (
                                            <button
                                                key={align}
                                                onClick={() => handleUpdateTextBox(selectedBox.id, { align, fullWidth: align === 'center' ? true : false, x: align === 'center' ? 0 : selectedBox.x })}
                                                className={`flex-1 py-1 text-xs font-semibold ${selectedBox.align === align ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {align === 'left' ? 'Esq' : align === 'center' ? 'Centro' : 'Dir'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Peso</label>
                                    <select value={selectedBox.fontWeight} onChange={(e) => handleUpdateTextBox(selectedBox.id, { fontWeight: e.target.value })} className="w-full border rounded p-1 text-sm">
                                        <option value="normal">Normal</option>
                                        <option value="bold">Negrito</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <button onClick={() => handleDeleteTextBox(selectedBox.id)} className="w-full text-red-600 hover:bg-red-50 py-2 rounded text-sm flex items-center justify-center">
                                    <Trash2 size={16} className="mr-2"/> Remover Caixa Atual
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic text-center py-4">Selecione uma caixa de texto ao lado para editá-la.</p>
                    )}
                </div>

                {/* Área do Canvas */}
                <div ref={wrapperRef} className="flex-1 bg-gray-100 rounded-lg border overflow-hidden p-4 flex items-center justify-center relative">
                    <div 
                        ref={containerRef}
                        className="relative bg-white shadow-lg shrink-0 origin-center" 
                        style={{
                            width: '1123px', // A4 Landscape roughly
                            height: '794px',
                            transform: `scale(${scale})`
                        }}
                    >
                        {template.backgroundImage && (
                            <img src={template.backgroundImage} alt="Template" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                        )}

                        {template.textBoxes?.map(box => (
                            <DraggableBox 
                                key={box.id} 
                                box={box} 
                                scale={scale}
                                selectedBoxId={selectedBoxId} 
                                setSelectedBoxId={setSelectedBoxId} 
                                handleDragStop={handleDragStop} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DraggableBox = ({ box, selectedBoxId, setSelectedBoxId, handleDragStop, scale }) => {
    const nodeRef = useRef(null);
    const xPx = (box.x / 100) * 1123;
    const yPx = (box.y / 100) * 794;

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: xPx, y: yPx }}
            onStop={(e, data) => handleDragStop(box.id, e, data)}
            bounds="parent"
            scale={scale}
            axis={box.fullWidth ? 'y' : 'both'}
        >
            <div 
                ref={nodeRef}
                onClick={() => setSelectedBoxId(box.id)}
                className={`absolute cursor-move inline-block whitespace-pre-wrap leading-tight ${selectedBoxId === box.id ? 'ring-2 ring-red-500 border border-red-500' : 'border border-transparent hover:border-gray-300 border-dashed'}`}
                style={{
                    fontSize: `${box.fontSize}px`,
                    color: box.color,
                    textAlign: box.align,
                    fontWeight: box.fontWeight,
                    fontFamily: box.fontFamily,
                    minWidth: '200px',
                    width: box.fullWidth ? '1123px' : 'auto',
                    left: 0
                }}
            >
                {box.text || 'Digite algo...'}
            </div>
        </Draggable>
    );
};

export default CertificateEditorPage;
