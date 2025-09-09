import React, { useState, useMemo } from 'react';
import { Calendar, Edit, Trash2, Plus, ClipboardList, GraduationCap, Users, CheckSquare, RotateCcw, LayoutTemplate, ChevronDown, ChevronUp } from 'lucide-react';
// NOVO: Importando o store
import { useAuthStore } from '../store/authStore';

// Componente para o Card de Curso (reutilizado nas listas principais)
const CourseCard = React.memo(({ course, isAdmin, onEditCourse, onDelete, onManageCourse, onFinalizeCourse, onReopenCourse }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFinished = new Date(course.endDate + 'T00:00:00') < today;
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-md flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-lg text-[#DC2626]">{course.name}</h4>
          {isAdmin && <div className="flex space-x-2"><button onClick={() => onEditCourse(course)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={16} /></button><button onClick={() => onDelete('course', course.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16} /></button></div>}
        </div>
        <p className="text-gray-600 mt-2 flex items-center text-sm"><GraduationCap size={14} className="inline mr-2" />Professor: {course.teacherName}</p>
        <p className="text-gray-600 text-sm"><Calendar size={14} className="inline mr-2" />{new Date(course.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(course.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        <p className="text-gray-600 text-sm"><Users size={14} className="inline mr-2" />{course.students?.length || 0} alunos</p>
      </div>
      <div className="mt-4 space-y-2">
        <button onClick={() => onManageCourse(course)} className="w-full text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-2"><ClipboardList size={16} /><span>Presença e Notas</span></button>
        {isAdmin && (<>
          {!course.finalized ? (<button onClick={() => onFinalizeCourse(course)} disabled={!isFinished} className="w-full text-sm bg-green-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"><CheckSquare size={16} /><span>Finalizar</span></button>
          ) : (<button onClick={() => onReopenCourse(course)} className="w-full text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-2"><RotateCcw size={16} /><span>Reabrir Curso</span></button>)}
        </>)}
      </div>
    </div>
  );
});

// ALTERADO: O componente não recebe mais `isAdmin`
const CoursesPage = ({
  courses, courseTemplates, onAddCourse, onAddCourseTemplate, onEditCourse, onEditCourseTemplate,
  onDelete, onManageCourse, onFinalizeCourse, onReopenCourse,
}) => {
  // NOVO: Buscando o status de admin diretamente do store
  const { isAdmin } = useAuthStore();

  const [activeTab, setActiveTab] = useState('turmas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const processedCourses = useMemo(() => {
    let filtered = [...courses];
    if (selectedTemplate) filtered = filtered.filter(c => c.templateId === selectedTemplate);
    if (selectedProfessor) filtered = filtered.filter(c => c.teacherId === selectedProfessor);
    if (searchTerm) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const open = [];
    const recentlyClosed = [];
    const archived = [];

    filtered.forEach(course => {
      const endDate = new Date(course.endDate + 'T00:00:00');
      if (endDate < sixMonthsAgo) {
        archived.push(course);
      } else if (endDate < today) {
        recentlyClosed.push(course);
      } else {
        open.push(course);
      }
    });

    open.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    recentlyClosed.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    archived.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    return { open, recentlyClosed, archived };
  }, [courses, searchTerm, selectedTemplate, selectedProfessor]);

  const uniqueProfessors = useMemo(() => [...new Map(courses.map(c => [c.teacherId, { id: c.teacherId, name: c.teacherName }])).values()], [courses]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Cursos</h2>
        {isAdmin && activeTab === 'turmas' && (<button onClick={() => onAddCourse()} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"><Plus size={20} /><span>Criar Nova Turma</span></button>)}
        {isAdmin && activeTab === 'modelos' && (<button onClick={() => onAddCourseTemplate()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"><Plus size={20} /><span>Criar Novo Modelo</span></button>)}
      </div>

      <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('turmas')} className={`${activeTab === 'turmas' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Turmas</button>
              <button onClick={() => setActiveTab('modelos')} className={`${activeTab === 'modelos' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Modelos de Curso</button>
          </nav>
      </div>

      {activeTab === 'turmas' && (
        <>
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Pesquisar por nome da turma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 rounded-md p-2 border"/>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full bg-gray-50 rounded-md p-2 border">
                <option value="">Filtrar por modelo...</option>
                {courseTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={selectedProfessor} onChange={(e) => setSelectedProfessor(e.target.value)} className="w-full bg-gray-50 rounded-md p-2 border">
                <option value="">Filtrar por professor...</option>
                {uniqueProfessors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Turmas em Aberto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedCourses.open.map(course => <CourseCard key={course.id} {...{course, isAdmin, onEditCourse, onDelete, onManageCourse, onFinalizeCourse, onReopenCourse}} />)}
          </div>
          {processedCourses.open.length === 0 && <p className="text-gray-500 italic">Nenhuma turma em aberto encontrada.</p>}
          
          <div className="my-6 border-t border-gray-200"></div>

          <h3 className="text-xl font-semibold text-gray-700 mb-4">Turmas Encerradas Recentemente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedCourses.recentlyClosed.map(course => <CourseCard key={course.id} {...{course, isAdmin, onEditCourse, onDelete, onManageCourse, onFinalizeCourse, onReopenCourse}} />)}
          </div>
          {processedCourses.recentlyClosed.length === 0 && <p className="text-gray-500 italic">Nenhuma turma encerrada recentemente encontrada.</p>}

          <div className="mt-8">
            <button onClick={() => setShowArchived(!showArchived)} className="w-full flex justify-between items-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left">
              <h3 className="text-xl font-semibold text-gray-700">Arquivo de Turmas (Mais de 6 meses)</h3>
              {showArchived ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </button>
            {showArchived && (
              <div className="mt-4 bg-white rounded-lg shadow-md border">
                <ul className="divide-y divide-gray-200">
                  {processedCourses.archived.map(course => (
                    <li key={course.id} className="p-3 flex flex-wrap justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-800">{course.name}</span>
                        <p className="text-xs text-gray-500">
                          {new Date(course.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(course.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                        <button onClick={() => onManageCourse(course)} className="text-gray-500 hover:text-blue-600" title="Presença e Notas"><ClipboardList size={18} /></button>
                        <button onClick={() => onEditCourse(course)} className="text-gray-500 hover:text-[#DC2626]" title="Editar"><Edit size={18} /></button>
                        <button onClick={() => onDelete('course', course.id)} className="text-gray-500 hover:text-red-600" title="Excluir"><Trash2 size={18} /></button>
                        {isAdmin && course.finalized && <button onClick={() => onReopenCourse(course)} className="text-gray-500 hover:text-yellow-600" title="Reabrir"><RotateCcw size={18} /></button>}
                      </div>
                    </li>
                  ))}
                </ul>
                {processedCourses.archived.length === 0 && <p className="text-gray-500 italic p-4">Nenhuma turma arquivada encontrada.</p>}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'modelos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseTemplates.sort((a,b) => a.name.localeCompare(b.name)).map(template => (
              <div key={template.id} className="bg-white rounded-lg p-4 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg text-blue-800 flex items-center"><LayoutTemplate size={18} className="mr-2"/>{template.name}</h4>
                    {isAdmin && <div className="flex space-x-2"><button onClick={() => onEditCourseTemplate(template)} className="text-gray-500 hover:text-blue-600"><Edit size={16} /></button><button onClick={() => onDelete('courseTemplate', template.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16} /></button></div>}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 border-t pt-2">
                      <p>Provas: {template.assessment.tests.count} (valendo {template.assessment.tests.value} cada)</p>
                      <p>Trabalhos: {template.assessment.assignments.count} (valendo {template.assessment.assignments.value} cada)</p>
                      <p>Atividades: {template.assessment.activities.count} (valendo {template.assessment.activities.value} cada)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};

export default CoursesPage;
