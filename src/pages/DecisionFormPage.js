import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';

const DecisionFormPage = () => {
    const [connects, setConnects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        connectId: '',
        observations: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchConnects = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/connects`));
                const connectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Ordenar por número
                connectsData.sort((a, b) => {
                    const numA = parseInt(a.number) || 0;
                    const numB = parseInt(b.number) || 0;
                    return numA - numB;
                });
                setConnects(connectsData);
            } catch (err) {
                console.error("Erro ao carregar connects:", err);
                setError("Não foi possível carregar a lista de Connects. Verifique sua conexão.");
            } finally {
                setLoading(false);
            }
        };
        fetchConnects();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        }
        setFormData(prev => ({ ...prev, phone: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.connectId || !formData.phone) {
            setError("Por favor, preencha nome, telefone e o Connect.");
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/decisions`), {
                ...formData,
                status: 'pendente',
                createdAt: serverTimestamp()
            });
            setSubmitted(true);
        } catch (err) {
            console.error("Erro ao salvar decisão:", err);
            setError("Ocorreu um erro ao salvar suas informações. Tente novamente mais tarde.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="h-20 w-20 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">Parabéns pela sua decisão!</h2>
                    <p className="text-gray-600 mb-6">
                        Estamos muito felizes por você. Seu cadastro foi recebido com sucesso e o líder do Connect selecionado entrará em contato em breve.
                    </p>
                    <Link to="/" className="inline-block mt-4 w-full bg-[#991B1B] text-white py-3 px-4 rounded-lg font-medium hover:bg-red-800 transition duration-300">
                        Voltar ao Início
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-[#991B1B] px-6 py-8 text-center">
                    <h2 className="text-3xl font-bold text-white">Aceitei a Jesus!</h2>
                    <p className="mt-2 text-white/90">
                        Preencha seus dados para que possamos acompanhar você nessa nova caminhada.
                    </p>
                </div>

                <div className="px-6 py-8">
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B]"
                                placeholder="Seu nome completo"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">WhatsApp / Telefone *</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                required
                                maxLength="15"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B]"
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail (opcional)</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B]"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Endereço (opcional)</label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B]"
                                placeholder="Rua, Número, Bairro"
                            />
                        </div>

                        <div>
                            <label htmlFor="connectId" className="block text-sm font-medium text-gray-700">Qual Connect você participa? *</label>
                            <select
                                id="connectId"
                                name="connectId"
                                value={formData.connectId}
                                onChange={handleChange}
                                required
                                disabled={loading}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B] bg-white"
                            >
                                <option value="">Selecione um Connect...</option>
                                {connects.map(connect => (
                                    <option key={connect.id} value={connect.id}>
                                        {connect.number} - {connect.name}
                                    </option>
                                ))}
                            </select>
                            {loading && <p className="text-xs text-gray-500 mt-1">Carregando Connects...</p>}
                        </div>

                        <div>
                            <label htmlFor="observations" className="block text-sm font-medium text-gray-700">Observações (opcional)</label>
                            <textarea
                                id="observations"
                                name="observations"
                                rows="3"
                                value={formData.observations}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#991B1B] focus:border-[#991B1B]"
                                placeholder="Algum pedido de oração ou comentário?"
                            ></textarea>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting || loading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#991B1B] hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#991B1B] ${(submitting || loading) ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                            >
                                {submitting ? 'Enviando...' : 'Enviar Decisão'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <Link to="/" className="flex items-center text-sm font-medium text-[#991B1B] hover:text-red-800">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a página inicial
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DecisionFormPage;
