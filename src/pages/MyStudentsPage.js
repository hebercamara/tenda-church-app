import React, { useState, useMemo } from 'react';
import { Search, GraduationCap, Users, Phone, Mail, MapPin, Calendar, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const MyStudentsPage = ({ allCourses, allMembers, allConnects }) => {
  const { currentUserData } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Filtrar cursos do professor atual (incluindo como substituto)
  const myCourses = useMemo(() => {
    if (!currentUserData || !allCourses || !allMembers) return [];
    
    const userEmail = currentUserData.email?.toLowerCase();
    
    // Função para verificar se o usuário é professor substituto ativo
    const isActiveSubstitute = (course) => {
      if (!course.substituteTeacher || !course.substituteTeacher.teacherId) return false;
      
      const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
      if (!substituteTeacher || substituteTeacher.email?.toLowerCase() !== userEmail) return false;
      
      const today = new Date();
      const startDate = new Date(course.substituteTeacher.startDate);
      
      // Se é indefinido, verifica apenas se já começou
      if (course.substituteTeacher.isIndefinite) {
        return today >= startDate;
      }
      
      // Se tem data de fim, verifica se está no período
      const endDate = new Date(course.substituteTeacher.endDate);
      return today >= startDate && today <= endDate;
    };
    
    return allCourses.filter(course => 
      course.teacherEmail?.toLowerCase() === userEmail || isActiveSubstitute(course)
    );
  }, [allCourses, currentUserData, allMembers]);

  // Obter todos os alunos dos cursos do professor
  const myStudents = useMemo(() => {
    if (!myCourses.length || !allMembers) return [];
    
    const studentIds = new Set();
    const studentsWithCourses = [];

    myCourses.forEach(course => {
      if (course.students && course.students.length > 0) {
        course.students.forEach(studentId => {
          const student = allMembers.find(m => m.id === studentId);
          if (student) {
            studentIds.add(studentId);
            
            // Encontrar o Connect do aluno
            const studentConnect = allConnects?.find(c => c.id === student.connectId);
            
            studentsWithCourses.push({
              ...student,
              courseName: course.name,
              courseId: course.id,
              connectName: studentConnect?.name || 'Sem Connect',
              connectNumber: studentConnect?.number || '',
              connectLeader: studentConnect ? allMembers.find(m => m.id === studentConnect.leaderId)?.name || 'Não encontrado' : 'N/A'
            });
          }
        });
      }
    });

    return studentsWithCourses;
  }, [myCourses, allMembers, allConnects]);

  // Filtrar alunos baseado na busca e curso selecionado
  const filteredStudents = useMemo(() => {
    let filtered = myStudents;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.name?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.phone?.includes(term) ||
        student.connectName?.toLowerCase().includes(term) ||
        student.courseName?.toLowerCase().includes(term)
      );
    }

    if (selectedCourse) {
      filtered = filtered.filter(student => student.courseId === selectedCourse);
    }

    return filtered;
  }, [myStudents, searchTerm, selectedCourse]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalStudents = new Set(myStudents.map(s => s.id)).size;
    const totalCourses = myCourses.length;
    const studentsWithConnect = myStudents.filter(s => s.connectId).length;
    
    return {
      totalStudents,
      totalCourses,
      studentsWithConnect,
      studentsWithoutConnect: totalStudents - studentsWithConnect
    };
  }, [myStudents, myCourses]);

  if (!currentUserData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Carregando dados do usuário...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Meus Alunos</h1>
        <p className="text-gray-600">Visualize todos os seus alunos e suas informações completas</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total de Alunos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Meus Cursos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Com Connect</p>
              <p className="text-2xl font-bold text-gray-900">{stats.studentsWithConnect}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Sem Connect</p>
              <p className="text-2xl font-bold text-gray-900">{stats.studentsWithoutConnect}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, email, telefone ou connect..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por curso */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os cursos</option>
            {myCourses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Alunos */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {myStudents.length === 0 ? (
              <>
                <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum aluno encontrado</h3>
                <p>Você ainda não possui alunos matriculados em seus cursos.</p>
              </>
            ) : (
              <>
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
                <p>Tente ajustar os filtros de busca.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aluno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connect
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <tr key={`${student.id}-${student.courseId}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">
                          {student.knownBy && student.knownBy !== student.name && `"${student.knownBy}"`}
                        </div>
                        {student.dob && (
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Calendar size={12} className="mr-1" />
                            {new Date(student.dob).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.email && (
                          <div className="flex items-center mb-1">
                            <Mail size={12} className="mr-1 text-gray-400" />
                            {student.email}
                          </div>
                        )}
                        {student.phone && (
                          <div className="flex items-center">
                            <Phone size={12} className="mr-1 text-gray-400" />
                            {student.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.connectName !== 'Sem Connect' ? (
                          <>
                            <div className="font-medium">{student.connectName}</div>
                            {student.connectNumber && (
                              <div className="text-xs text-gray-500">#{student.connectNumber}</div>
                            )}
                            {student.connectLeader && student.connectLeader !== 'N/A' && (
                              <div className="text-xs text-gray-500">Líder: {student.connectLeader}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">Sem Connect</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.courseName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(student.street || student.neighborhood || student.city) ? (
                          <div className="flex items-start">
                            <MapPin size={12} className="mr-1 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              {student.street && <div>{student.street}</div>}
                              {student.neighborhood && <div className="text-xs text-gray-500">{student.neighborhood}</div>}
                              {student.city && <div className="text-xs text-gray-500">{student.city}</div>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Não informado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo */}
      {filteredStudents.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Mostrando {filteredStudents.length} de {myStudents.length} alunos
        </div>
      )}
    </div>
  );
};

export default MyStudentsPage;