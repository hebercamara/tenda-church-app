import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    User, 
    BookOpen, 
    Users, 
    TrendingUp, 
    Calendar,
    Phone,
    Mail,
    MapPin,
    Edit3,
    Save,
    X,
    Award,
    Clock,
    CheckCircle,
    Eye,
    EyeOff,
    Key
} from 'lucide-react';

const PersonalPortalPage = ({ allCourses, allMembers, allConnects }) => {
    const { currentUserData } = useAuthStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [userCourses, setUserCourses] = useState([]);
    const [userConnect, setUserConnect] = useState(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({});
    
    // Estados para edição de email e senha
    const [editingEmail, setEditingEmail] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [emailData, setEmailData] = useState({ newEmail: '' });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUserData && allCourses && allConnects) {
            loadUserData();
        }
    }, [currentUserData, allCourses, allConnects]);

    const loadUserData = async () => {
        try {
            // Buscar cursos do usuário
            const coursesQuery = query(
                collection(db, 'courses'),
                where('students', 'array-contains', currentUserData.email)
            );
            const coursesSnapshot = await getDocs(coursesQuery);
            const courses = coursesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUserCourses(courses);

            // Buscar Connect do usuário
            const userMember = allMembers.find(member => member.email === currentUserData.email);
            if (userMember && userMember.connectId) {
                const connect = allConnects.find(c => c.id === userMember.connectId);
                setUserConnect(connect);
            }

            // Inicializar dados do perfil
            setProfileData(userMember || {});
            
            // Inicializar dados de email
            setEmailData({ newEmail: currentUserData.email || '' });
            
            setLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            setLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        try {
            const userMember = allMembers.find(member => member.email === currentUserData.email);
            if (userMember) {
                const memberRef = doc(db, 'members', userMember.id);
                await updateDoc(memberRef, {
                    name: profileData.name,
                    phone: profileData.phone,
                    address: profileData.address,
                    city: profileData.city,
                    state: profileData.state,
                    zipCode: profileData.zipCode
                });
                setEditingProfile(false);
                setMessage('Perfil atualizado com sucesso!');
                setError('');
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            setError('Erro ao atualizar perfil. Tente novamente.');
            setMessage('');
        }
    };

    const handleEmailUpdate = async () => {
        try {
            setError('');
            setMessage('');
            
            if (emailData.newEmail === currentUserData.email) {
                setError('O novo e-mail deve ser diferente do atual.');
                return;
            }

            await updateEmail(auth.currentUser, emailData.newEmail);
            
            // Atualizar no Firestore também
            const userMember = allMembers.find(member => member.email === currentUserData.email);
            if (userMember) {
                const memberRef = doc(db, 'members', userMember.id);
                await updateDoc(memberRef, {
                    email: emailData.newEmail
                });
            }
            
            setEditingEmail(false);
            setMessage('E-mail atualizado com sucesso! Você talvez precise fazer login novamente.');
        } catch (error) {
            console.error('Erro ao atualizar e-mail:', error);
            setError('Erro ao atualizar e-mail. Pode ser necessário fazer login novamente para realizar esta operação.');
            setMessage('');
        }
    };

    const handlePasswordUpdate = async () => {
        try {
            setError('');
            setMessage('');
            
            if (passwordData.newPassword.length < 6) {
                setError('A nova senha deve ter no mínimo 6 caracteres.');
                return;
            }
            
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }

            await updatePassword(auth.currentUser, passwordData.newPassword);
            
            setPasswordData({ newPassword: '', confirmPassword: '' });
            setEditingPassword(false);
            setMessage('Senha atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            setError('Erro ao atualizar a senha. Tente novamente.');
            setMessage('');
        }
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
        { id: 'courses', label: 'Meus Cursos', icon: BookOpen },
        { id: 'connect', label: 'Meu Connect', icon: Users },
        { id: 'leadership', label: 'Trilha de Liderança', icon: Award },
        { id: 'profile', label: 'Meu Perfil', icon: User }
    ];

    if (loading) {
        return <LoadingSpinner />;
    }

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card Cursos */}
                <div 
                    className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700 cursor-pointer hover:bg-stone-700 transition-colors"
                    onClick={() => setActiveTab('courses')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-300">Cursos Matriculados</p>
                            <p className="text-2xl font-bold text-white">{userCourses.length}</p>
                        </div>
                        <BookOpen className="h-8 w-8 text-[#991B1B]" />
                    </div>
                </div>

                {/* Card Connect */}
                <div 
                    className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700 cursor-pointer hover:bg-stone-700 transition-colors"
                    onClick={() => setActiveTab('connect')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-300">Meu Connect</p>
                            <p className="text-lg font-semibold text-white">
                                {userConnect ? userConnect.name : 'Não vinculado'}
                            </p>
                        </div>
                        <Users className="h-8 w-8 text-stone-400" />
                    </div>
                </div>

                {/* Card Trilha */}
                <div 
                    className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700 cursor-pointer hover:bg-stone-700 transition-colors"
                    onClick={() => setActiveTab('leadership')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-300">Nível de Liderança</p>
                            <p className="text-lg font-semibold text-white">
                                {profileData.leadershipLevel || 'Membro'}
                            </p>
                        </div>
                        <Award className="h-8 w-8 text-[#991B1B]" />
                    </div>
                </div>
            </div>

            {/* Resumo Recente */}
            <div className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700">
                <h3 className="text-lg font-semibold text-white mb-4">Atividades Recentes</h3>
                <div className="space-y-3">
                    {userCourses.slice(0, 3).map(course => (
                        <div key={course.id} className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-stone-400" />
                            <span className="text-stone-300">Matriculado em {course.name}</span>
                            <span className="text-sm text-stone-500">
                                {new Date(course.createdAt?.toDate()).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                    {userConnect && (
                        <div className="flex items-center space-x-3">
                            <Users className="h-5 w-5 text-stone-400" />
                            <span className="text-stone-300">Vinculado ao Connect {userConnect.name}</span>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );

    const renderCourses = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Meus Cursos</h2>
                <span className="text-stone-300">{userCourses.length} cursos</span>
            </div>
            
            {userCourses.length === 0 ? (
                <div className="bg-stone-800 rounded-lg p-8 text-center border border-stone-700 shadow-lg">
                    <BookOpen className="h-12 w-12 text-stone-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Nenhum curso encontrado</h3>
                    <p className="text-stone-300">Você ainda não está matriculado em nenhum curso.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userCourses.map(course => (
                        <div key={course.id} className="bg-stone-800 rounded-lg p-6 border border-stone-700 shadow-lg">
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">{course.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    course.status === 'active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-stone-100 text-stone-800'
                                }`}>
                                    {course.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            
                            <p className="text-stone-300 text-sm mb-4">{course.description}</p>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-stone-300">Progresso</span>
                                    <span className="text-white">{Math.round(course.progress || 0)}%</span>
                                </div>
                                <div className="w-full bg-stone-700 rounded-full h-2">
                                    <div 
                                        className="bg-[#991B1B] h-2 rounded-full" 
                                        style={{ width: `${course.progress || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderConnect = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Meu Connect</h2>
            </div>
            
            {userConnect ? (
                <div className="bg-stone-800 rounded-lg p-6 border border-stone-700 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-white">{userConnect.name}</h3>
                            <p className="text-stone-300 mt-1">Líder: {userConnect.leaderName}</p>
                        </div>
                        <Users className="h-8 w-8 text-[#991B1B]" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{userConnect.memberCount || 0}</p>
                            <p className="text-stone-300 text-sm">Membros</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{userConnect.meetingsThisMonth || 0}</p>
                            <p className="text-stone-300 text-sm">Reuniões este mês</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{userConnect.activeProjects || 0}</p>
                            <p className="text-stone-300 text-sm">Projetos ativos</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-stone-800 rounded-lg p-8 text-center border border-stone-700 shadow-lg">
                    <Users className="h-12 w-12 text-stone-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Nenhum Connect encontrado</h3>
                    <p className="text-stone-300">Você ainda não está vinculado a nenhum Connect.</p>
                </div>
            )}
        </div>
    );

    const renderLeadership = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Trilha de Liderança</h2>
            </div>
            
            <div className="bg-stone-800 rounded-lg p-6 border border-stone-700 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-white">Nível Atual</h3>
                        <p className="text-2xl font-bold text-[#991B1B] mt-1">
                            {profileData.leadershipLevel || 'Membro'}
                        </p>
                    </div>
                    <Award className="h-12 w-12 text-[#991B1B]" />
                </div>
                
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-stone-300">Progresso para próximo nível</span>
                            <span className="text-white">75%</span>
                        </div>
                        <div className="w-full bg-stone-700 rounded-full h-3">
                            <div className="bg-[#991B1B] h-3 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="text-center p-4 bg-stone-700 rounded-lg">
                            <p className="text-lg font-bold text-white">12</p>
                            <p className="text-stone-300 text-sm">Pessoas lideradas</p>
                        </div>
                        <div className="text-center p-4 bg-stone-700 rounded-lg">
                            <p className="text-lg font-bold text-white">8</p>
                            <p className="text-stone-300 text-sm">Meses de liderança</p>
                        </div>
                        <div className="text-center p-4 bg-stone-700 rounded-lg">
                            <p className="text-lg font-bold text-white">95%</p>
                            <p className="text-stone-300 text-sm">Taxa de retenção</p>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );

    const renderProfile = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Meu Perfil</h2>
                {!editingProfile ? (
                    <button
                        onClick={() => setEditingProfile(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#991B1B] text-white rounded-lg hover:bg-[#7f1d1d] transition-colors"
                    >
                        <Edit3 className="h-4 w-4" />
                        <span>Editar</span>
                    </button>
                ) : (
                    <div className="flex space-x-2">
                        <button
                            onClick={handleProfileUpdate}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#991B1B] text-white rounded-lg hover:bg-[#7f1d1d] transition-colors"
                        >
                            <Save className="h-4 w-4" />
                            <span>Salvar</span>
                        </button>
                        <button
                            onClick={() => setEditingProfile(false)}
                            className="flex items-center space-x-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            <span>Cancelar</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Nome Completo
                        </label>
                        {editingProfile ? (
                            <input
                                type="text"
                                value={profileData.name || ''}
                                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                            />
                        ) : (
                            <p className="text-white">{profileData.name || 'Não informado'}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Email
                        </label>
                        <p className="text-white">{currentUserData?.email || 'Não informado'}</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Telefone
                        </label>
                        {editingProfile ? (
                            <input
                                type="tel"
                                value={profileData.phone || ''}
                                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                            />
                        ) : (
                            <p className="text-white">{profileData.phone || 'Não informado'}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Cidade
                        </label>
                        {editingProfile ? (
                            <input
                                type="text"
                                value={profileData.city || ''}
                                onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                            />
                        ) : (
                            <p className="text-white">{profileData.city || 'Não informado'}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Estado
                        </label>
                        {editingProfile ? (
                            <input
                                type="text"
                                value={profileData.state || ''}
                                onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                            />
                        ) : (
                            <p className="text-white">{profileData.state || 'Não informado'}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            CEP
                        </label>
                        {editingProfile ? (
                            <input
                                type="text"
                                value={profileData.zipCode || ''}
                                onChange={(e) => setProfileData({...profileData, zipCode: e.target.value})}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                            />
                        ) : (
                            <p className="text-white">{profileData.zipCode || 'Não informado'}</p>
                        )}
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Endereço
                        </label>
                        {editingProfile ? (
                            <textarea
                                value={profileData.address || ''}
                                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                rows={3}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                            />
                        ) : (
                            <p className="text-white">{profileData.address || 'Não informado'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Mensagens de sucesso e erro */}
            {message && (
                <div className="bg-green-800 border border-green-600 text-green-100 px-4 py-3 rounded-lg">
                    {message}
                </div>
            )}
            {error && (
                <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Seção de Alterar E-mail */}
            <div className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center">
                        <Mail className="h-5 w-5 mr-2" />
                        Alterar E-mail
                    </h3>
                    {!editingEmail ? (
                        <button
                            onClick={() => setEditingEmail(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
                        >
                            <Edit3 className="h-4 w-4" />
                            <span>Editar</span>
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <button
                                onClick={handleEmailUpdate}
                                className="flex items-center space-x-2 px-4 py-2 bg-[#991B1B] text-white rounded-lg hover:bg-[#7f1d1d] transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                <span>Salvar</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingEmail(false);
                                    setEmailData({ newEmail: currentUserData.email || '' });
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
                            >
                                <X className="h-4 w-4" />
                                <span>Cancelar</span>
                            </button>
                        </div>
                    )}
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2">
                        E-mail
                    </label>
                    {editingEmail ? (
                        <input
                            type="email"
                            value={emailData.newEmail}
                            onChange={(e) => setEmailData({ newEmail: e.target.value })}
                            className="w-full max-w-lg px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                        />
                    ) : (
                        <p className="text-white">{currentUserData?.email || 'Não informado'}</p>
                    )}
                </div>
            </div>

            {/* Seção de Alterar Senha */}
            <div className="bg-stone-800 rounded-lg shadow-lg p-6 border border-stone-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center">
                        <Key className="h-5 w-5 mr-2" />
                        Alterar Senha
                    </h3>
                    {!editingPassword ? (
                        <button
                            onClick={() => setEditingPassword(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
                        >
                            <Edit3 className="h-4 w-4" />
                            <span>Editar</span>
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <button
                                onClick={handlePasswordUpdate}
                                className="flex items-center space-x-2 px-4 py-2 bg-[#991B1B] text-white rounded-lg hover:bg-[#7f1d1d] transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                <span>Salvar</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingPassword(false);
                                    setPasswordData({ newPassword: '', confirmPassword: '' });
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors"
                            >
                                <X className="h-4 w-4" />
                                <span>Cancelar</span>
                            </button>
                        </div>
                    )}
                </div>
                
                {editingPassword && (
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Nova Senha
                            </label>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                className="w-full max-w-lg px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B] pr-10"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? 
                                    <EyeOff className="h-5 w-5 text-stone-400" /> : 
                                    <Eye className="h-5 w-5 text-stone-400" />
                                }
                            </button>
                        </div>
                        
                        <div className="relative">
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Confirmar Nova Senha
                            </label>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                className="w-full max-w-lg px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B] pr-10"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? 
                                    <EyeOff className="h-5 w-5 text-stone-400" /> : 
                                    <Eye className="h-5 w-5 text-stone-400" />
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'courses':
                return renderCourses();
            case 'connect':
                return renderConnect();
            case 'leadership':
                return renderLeadership();
            case 'profile':
                return renderProfile();
            default:
                return renderDashboard();
        }
    };

    return (
        <div className="min-h-screen bg-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        Olá, {currentUserData?.displayName || 'Usuário'}!
                    </h1>
                    <p className="text-stone-300 mt-2">
                        Bem-vindo à sua área pessoal. Aqui você pode acompanhar seus cursos, Connect e muito mais.
                    </p>
                </div>

                {/* Navegação por Abas */}
                <div className="bg-stone-800 rounded-lg shadow-lg mb-6 border border-stone-700">
                    <div className="border-b border-stone-700">
                        <nav className="flex space-x-8 px-6">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === tab.id
                                                ? 'border-[#991B1B] text-[#991B1B]'
                                                : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-600'
                                        }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Conteúdo da Aba */}
                <div className="bg-stone-900">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default PersonalPortalPage;