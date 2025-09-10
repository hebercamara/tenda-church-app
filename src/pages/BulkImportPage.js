import React, { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { Upload, Download, Users, AlertCircle, CheckCircle, X, FileText, Plus, Eye } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { convertBrazilianDateToISO, convertISOToBrazilianDate } from '../utils/dateUtils';
import * as XLSX from 'xlsx';

const BulkImportPage = () => {
  const { user, isAdmin } = useAuthStore();
  const [importMethod, setImportMethod] = useState('manual'); // 'manual', 'csv' ou 'file'
  const [csvData, setCsvData] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [manualData, setManualData] = useState('');
  const [manualMembers, setManualMembers] = useState([{
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
    dataNascimento: '',
    genero: '',
    estadoCivil: '',
    connect: '',
    supervisor: '',
    lider: '',
    aceitouJesus: '',
    discipuladoInicial: '',
    batismo: '',
    membresia: '',
    treinamentoConnect: ''
  }]);
  const [parsedMembers, setParsedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [errors, setErrors] = useState([]);



  // Template CSV para download
  const csvTemplate = `nome,email,telefone,endereco,dataNascimento,genero,estadoCivil,connect,supervisor,lider,aceitouJesus,discipuladoInicial,batismo,membresia,treinamentoConnect
João Silva,joao@email.com,11999999999,"Rua A, 123",15/01/1990,Masculino,Solteiro,Connect Alpha,Maria Santos,Pedro Lima,15/01/2023,20/02/2023,10/03/2023,15/04/2023,20/05/2023
Maria Santos,maria@email.com,11888888888,"Rua B, 456",20/05/1985,Feminino,Casada,Connect Beta,Ana Costa,Carlos Oliveira,10/01/2022,15/02/2022,05/03/2022,20/04/2022,25/05/2022`;

  // Função para fazer download do template CSV
  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_membros.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para fazer download do template Excel
  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Dados do template
    const templateData = [
      [
        'nome', 'email', 'telefone', 'endereco', 'dataNascimento', 'genero', 
        'estadoCivil', 'connect', 'supervisor', 'lider', 'aceitouJesus', 
        'discipuladoInicial', 'batismo', 'membresia', 'treinamentoConnect'
      ],
      [
        'João Silva', 'joao@email.com', '11999999999', 'Rua das Flores, 123', 
        '15/03/1990', 'Masculino', 'Casado', 'Connect Alpha', 'Maria Santos', 
        'Pedro Costa', '10/01/2020', '15/02/2020', '20/06/2020', '10/12/2020', '05/03/2021'
      ],
      [
        'Maria Oliveira', 'maria@email.com', '11888888888', 'Av. Principal, 456', 
        '22/07/1985', 'Feminino', 'Solteira', 'Connect Beta', 'João Silva', 
        'Ana Lima', '05/05/2019', '10/06/2019', '15/09/2019', '20/01/2020', '25/04/2020'
      ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Definir larguras das colunas
    const colWidths = [
      { wch: 15 }, // nome
      { wch: 25 }, // email
      { wch: 15 }, // telefone
      { wch: 30 }, // endereco
      { wch: 12 }, // dataNascimento
      { wch: 10 }, // genero
      { wch: 12 }, // estadoCivil
      { wch: 15 }, // connect
      { wch: 15 }, // supervisor
      { wch: 15 }, // lider
      { wch: 12 }, // aceitouJesus
      { wch: 15 }, // discipuladoInicial
      { wch: 12 }, // batismo
      { wch: 12 }, // membresia
      { wch: 18 }  // treinamentoConnect
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Membros');
    XLSX.writeFile(wb, 'template_membros.xlsx');
  };

  // Parser para dados manuais (campos estruturados)
  const parseManualData = () => {
    const members = [];
    const errors = [];

    manualMembers.forEach((member, index) => {
      if (member.nome.trim() || member.email.trim() || member.telefone.trim()) {
        // Validação básica
        if (!member.nome.trim()) {
          errors.push(`Membro ${index + 1}: Nome é obrigatório`);
        }
        if (!member.email.trim()) {
          errors.push(`Membro ${index + 1}: Email é obrigatório`);
        }
        if (!member.telefone.trim()) {
          errors.push(`Membro ${index + 1}: Telefone é obrigatório`);
        }
        
        if (member.nome.trim() && member.email.trim() && member.telefone.trim()) {
          const dataNascimento = member.dataNascimento ? convertBrazilianDateToISO(member.dataNascimento) : '';
          const aceitouJesus = member.aceitouJesus ? convertBrazilianDateToISO(member.aceitouJesus) : '';
          const discipuladoInicial = member.discipuladoInicial ? convertBrazilianDateToISO(member.discipuladoInicial) : '';
          const batismo = member.batismo ? convertBrazilianDateToISO(member.batismo) : '';
          const membresia = member.membresia ? convertBrazilianDateToISO(member.membresia) : '';
          const treinamentoConnect = member.treinamentoConnect ? convertBrazilianDateToISO(member.treinamentoConnect) : '';
          
          members.push({
            nome: member.nome.trim(),
            email: member.email.trim(),
            telefone: member.telefone.trim(),
            endereco: member.endereco.trim(),
            dataNascimento,
            genero: member.genero,
            estadoCivil: member.estadoCivil,
            connect: member.connect.trim(),
            supervisor: member.supervisor.trim(),
            lider: member.lider.trim(),
            milestonesData: {
              acceptedJesus: aceitouJesus ? { completed: true, date: aceitouJesus } : { completed: false, date: null },
              initialDiscipleship: discipuladoInicial ? { completed: true, date: discipuladoInicial } : { completed: false, date: null },
              baptism: batismo ? { completed: true, date: batismo } : { completed: false, date: null },
              membership: membresia ? { completed: true, date: membresia } : { completed: false, date: null },
              connectTraining: treinamentoConnect ? { completed: true, date: treinamentoConnect } : { completed: false, date: null }
            },
            dataRegistro: new Date(),
            registradoPor: user?.email || 'Sistema'
          });
        }
      }
    });

    return { members, errors };
  };

  // Parser para arquivos Excel
  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            resolve({ members: [], errors: ['Arquivo vazio ou sem dados válidos'] });
            return;
          }
          
          const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
          const members = [];
          const errors = [];
          
          // Mapear headers para campos esperados
          const fieldMap = {
            'nome': 'nome',
            'name': 'nome',
            'email': 'email',
            'telefone': 'telefone',
            'phone': 'telefone',
            'endereco': 'endereco',
            'endereço': 'endereco',
            'address': 'endereco',
            'datanascimento': 'dataNascimento',
            'data_nascimento': 'dataNascimento',
            'data de nascimento': 'dataNascimento',
            'birthdate': 'dataNascimento',
            'genero': 'genero',
            'gênero': 'genero',
            'gender': 'genero',
            'estadocivil': 'estadoCivil',
            'estado_civil': 'estadoCivil',
            'estado civil': 'estadoCivil',
            'marital_status': 'estadoCivil',
            'connect': 'connect',
            'supervisor': 'supervisor',
            'lider': 'lider',
            'líder': 'lider',
            'leader': 'lider',
            'aceitoujesus': 'aceitouJesus',
            'aceitou_jesus': 'aceitouJesus',
            'aceitou jesus': 'aceitouJesus',
            'accepted_jesus': 'aceitouJesus',
            'discipuladoinicial': 'discipuladoInicial',
            'discipulado_inicial': 'discipuladoInicial',
            'discipulado inicial': 'discipuladoInicial',
            'initial_discipleship': 'discipuladoInicial',
            'batismo': 'batismo',
            'baptism': 'batismo',
            'membresia': 'membresia',
            'membership': 'membresia',
            'treinamentoconnect': 'treinamentoConnect',
            'treinamento_connect': 'treinamentoConnect',
            'treinamento connect': 'treinamentoConnect',
            'connect_training': 'treinamentoConnect'
          };
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
              const member = {
                dataRegistro: new Date(),
                registradoPor: user?.email || 'Sistema'
              };
              
              headers.forEach((header, index) => {
                const field = fieldMap[header];
                if (field && row[index] !== null && row[index] !== undefined && row[index] !== '') {
                  let value = row[index].toString().trim();
                  
                  // Converter datas para formato ISO se necessário
                  if (field === 'dataNascimento' || field === 'aceitouJesus' || field === 'discipuladoInicial' || field === 'batismo' || field === 'membresia' || field === 'treinamentoConnect') {
                    // Se for um número (data do Excel), converter
                    if (!isNaN(row[index]) && typeof row[index] === 'number') {
                      const excelDate = XLSX.SSF.parse_date_code(row[index]);
                      value = `${excelDate.d.toString().padStart(2, '0')}/${excelDate.m.toString().padStart(2, '0')}/${excelDate.y}`;
                    }
                    if (field === 'dataNascimento') {
                      member[field] = convertBrazilianDateToISO(value);
                    } else {
                      // Para marcos de liderança, armazenar temporariamente
                      member[field] = convertBrazilianDateToISO(value);
                    }
                  } else {
                    member[field] = value;
                  }
                }
              });
              
              // Criar objeto milestonesData a partir dos campos temporários
              member.milestonesData = {
                acceptedJesus: member.aceitouJesus ? { completed: true, date: member.aceitouJesus } : { completed: false, date: null },
                initialDiscipleship: member.discipuladoInicial ? { completed: true, date: member.discipuladoInicial } : { completed: false, date: null },
                baptism: member.batismo ? { completed: true, date: member.batismo } : { completed: false, date: null },
                membership: member.membresia ? { completed: true, date: member.membresia } : { completed: false, date: null },
                connectTraining: member.treinamentoConnect ? { completed: true, date: member.treinamentoConnect } : { completed: false, date: null }
              };
              
              // Remover campos temporários
              delete member.aceitouJesus;
              delete member.discipuladoInicial;
              delete member.batismo;
              delete member.membresia;
              delete member.treinamentoConnect;
              
              // Validação básica
              if (!member.nome || !member.email) {
                errors.push(`Linha ${i + 1}: Nome e email são obrigatórios`);
              } else {
                members.push(member);
              }
            }
          }
          
          resolve({ members, errors });
        } catch (error) {
          reject(new Error(`Erro ao processar arquivo Excel: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // Parser para CSV
  const parseCsvData = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const members = [];
    const errors = [];

    // Mapear headers para campos esperados
    const fieldMap = {
      'nome': 'nome',
      'name': 'nome',
      'email': 'email',
      'telefone': 'telefone',
      'phone': 'telefone',
      'endereco': 'endereco',
      'endereço': 'endereco',
      'address': 'endereco',
      'datanascimento': 'dataNascimento',
      'data_nascimento': 'dataNascimento',
      'birthdate': 'dataNascimento',
      'genero': 'genero',
      'gênero': 'genero',
      'gender': 'genero',
      'estadocivil': 'estadoCivil',
      'estado_civil': 'estadoCivil',
      'marital_status': 'estadoCivil',
      'connect': 'connect',
      'supervisor': 'supervisor',
      'lider': 'lider',
      'líder': 'lider',
      'leader': 'lider',
      'aceitoujesus': 'aceitouJesus',
      'aceitou_jesus': 'aceitouJesus',
      'aceitou jesus': 'aceitouJesus',
      'accepted_jesus': 'aceitouJesus',
      'discipuladoinicial': 'discipuladoInicial',
      'discipulado_inicial': 'discipuladoInicial',
      'discipulado inicial': 'discipuladoInicial',
      'initial_discipleship': 'discipuladoInicial',
      'batismo': 'batismo',
      'baptism': 'batismo',
      'membresia': 'membresia',
      'membership': 'membresia',
      'treinamentoconnect': 'treinamentoConnect',
      'treinamento_connect': 'treinamentoConnect',
      'treinamento connect': 'treinamentoConnect',
      'connect_training': 'treinamentoConnect'
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const member = {
          dataRegistro: new Date(),
          registradoPor: user?.email || 'Sistema'
        };

        headers.forEach((header, index) => {
          const field = fieldMap[header];
          if (field && values[index]) {
            // Converter datas para formato ISO se necessário
            if (field === 'dataNascimento' || field === 'aceitouJesus' || field === 'discipuladoInicial' || field === 'batismo' || field === 'membresia' || field === 'treinamentoConnect') {
              member[field] = convertBrazilianDateToISO(values[index]);
            } else {
              member[field] = values[index];
            }
          }
        });
        
        // Criar objeto milestonesData a partir dos campos temporários
        member.milestonesData = {
          acceptedJesus: member.aceitouJesus ? { completed: true, date: member.aceitouJesus } : { completed: false, date: null },
          initialDiscipleship: member.discipuladoInicial ? { completed: true, date: member.discipuladoInicial } : { completed: false, date: null },
          baptism: member.batismo ? { completed: true, date: member.batismo } : { completed: false, date: null },
          membership: member.membresia ? { completed: true, date: member.membresia } : { completed: false, date: null },
          connectTraining: member.treinamentoConnect ? { completed: true, date: member.treinamentoConnect } : { completed: false, date: null }
        };
        
        // Remover campos temporários
        delete member.aceitouJesus;
        delete member.discipuladoInicial;
        delete member.batismo;
        delete member.membresia;
        delete member.treinamentoConnect;

        // Validação básica
        if (!member.nome || !member.email) {
          errors.push(`Linha ${i + 1}: Nome e email são obrigatórios`);
        } else {
          members.push(member);
        }
      }
    }

    return { members, errors };
  };

  // Processar dados
  const processData = async () => {
    setErrors([]);
    setIsLoading(true);
    
    try {
      let result;

      if (importMethod === 'csv') {
        result = parseCsvData(csvData);
      } else if (importMethod === 'file' && selectedFile) {
        result = await parseExcelFile(selectedFile);
      } else {
        result = parseManualData();
      }

      setParsedMembers(result.members);
      setErrors(result.errors);
      setShowPreview(true);
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setIsLoading(false);
    }
  };

  // Adicionar novo membro manual
  const addManualMember = () => {
    setManualMembers([...manualMembers, {
      nome: '',
      email: '',
      telefone: '',
      endereco: '',
      dataNascimento: '',
      genero: '',
      estadoCivil: '',
      connect: '',
      supervisor: '',
      lider: '',
      aceitouJesus: '',
      discipuladoInicial: '',
      batismo: '',
      membresia: '',
      treinamentoConnect: ''
    }]);
  };

  // Remover membro manual
  const removeManualMember = (index) => {
    if (manualMembers.length > 1) {
      const newMembers = manualMembers.filter((_, i) => i !== index);
      setManualMembers(newMembers);
    }
  };

  // Atualizar campo de membro manual
  const updateManualMember = (index, field, value) => {
    const newMembers = [...manualMembers];
    newMembers[index][field] = value;
    setManualMembers(newMembers);
  };

  // Importar membros para o Firestore
  const importMembers = async () => {
    if (parsedMembers.length === 0) return;

    setIsLoading(true);
    const batch = writeBatch(db);
    const results = { success: 0, errors: [] };

    try {
      for (let i = 0; i < parsedMembers.length; i++) {
        const member = parsedMembers[i];
        try {
          const docRef = doc(collection(db, 'members'));
          batch.set(docRef, member);
          results.success++;
        } catch (error) {
          results.errors.push(`${member.nome}: ${error.message}`);
        }
      }

      await batch.commit();
      setImportResults(results);
      setShowPreview(false);
      
      // Limpar dados após importação bem-sucedida
      if (results.errors.length === 0) {
        setCsvData('');
        setManualData('');
        setParsedMembers([]);
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      setImportResults({
        success: 0,
        errors: [`Erro geral: ${error.message}`]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se é admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Users className="mr-3 h-8 w-8 text-red-600" />
            Importação em Massa de Membros
          </h1>
          <p className="text-gray-600">
            Importe múltiplos membros de uma vez através de CSV ou inserção manual
          </p>
        </div>

        {/* Método de Importação */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Método de Importação</h2>
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setImportMethod('manual')}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                importMethod === 'manual'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="mr-2 h-4 w-4" />
              Inserção Manual
            </button>
            <button
              onClick={() => setImportMethod('file')}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                importMethod === 'file'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Excel/CSV
            </button>
            <button
              onClick={() => setImportMethod('csv')}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                importMethod === 'csv'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="mr-2 h-4 w-4" />
              Texto CSV
            </button>
          </div>

          {/* Template Download */}
          <div className="mb-6 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Templates para Download</h3>
                <p className="text-sm text-red-700">
                  Baixe o template no formato desejado para ver o formato correto dos dados.
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </button>
                <button
                  onClick={downloadExcelTemplate}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </button>
              </div>
            </div>
          </div>

          {/* Área de Input */}
          {importMethod === 'file' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Upload de Arquivo</h3>
              <p className="text-sm text-gray-600">
                Selecione um arquivo Excel (.xlsx) ou CSV (.csv) para importar os dados dos membros
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                <input
                  type="file"
                  id="fileInput"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="fileInput"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    Clique para selecionar um arquivo
                  </span>
                  <span className="text-xs text-gray-500">
                    Formatos suportados: .xlsx, .xls, .csv
                  </span>
                </label>
              </div>
              
              {selectedFile && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-700">
                    Arquivo selecionado: {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="ml-auto text-green-600 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : importMethod === 'manual' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Membros para Importação</h3>
                <button
                  onClick={addManualMember}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Membro
                </button>
              </div>
              
              <div className="space-y-4">
                {manualMembers.map((member, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Membro {index + 1}</h4>
                      {manualMembers.length > 1 && (
                        <button
                          onClick={() => removeManualMember(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Nome */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          value={member.nome}
                          onChange={(e) => updateManualMember(index, 'nome', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Nome completo"
                        />
                      </div>
                      
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateManualMember(index, 'email', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      
                      {/* Telefone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone *
                        </label>
                        <input
                          type="tel"
                          value={member.telefone}
                          onChange={(e) => updateManualMember(index, 'telefone', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      
                      {/* Endereço */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={member.endereco}
                          onChange={(e) => updateManualMember(index, 'endereco', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Rua, número, bairro, cidade"
                        />
                      </div>
                      
                      {/* Data de Nascimento */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Nascimento
                        </label>
                        <input
                          type="text"
                          value={member.dataNascimento}
                          onChange={(e) => updateManualMember(index, 'dataNascimento', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="dd/mm/yyyy"
                        />
                      </div>
                      
                      {/* Gênero */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gênero
                        </label>
                        <select
                          value={member.genero}
                          onChange={(e) => updateManualMember(index, 'genero', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Selecione</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                        </select>
                      </div>
                      
                      {/* Estado Civil */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado Civil
                        </label>
                        <select
                          value={member.estadoCivil}
                          onChange={(e) => updateManualMember(index, 'estadoCivil', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Selecione</option>
                          <option value="Solteiro">Solteiro</option>
                          <option value="Casado">Casado</option>
                          <option value="Divorciado">Divorciado</option>
                          <option value="Viúvo">Viúvo</option>
                        </select>
                      </div>
                      
                      {/* Connect */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connect
                        </label>
                        <input
                          type="text"
                          value={member.connect}
                          onChange={(e) => updateManualMember(index, 'connect', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Nome do Connect"
                        />
                      </div>
                      
                      {/* Supervisor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supervisor
                        </label>
                        <input
                          type="text"
                          value={member.supervisor}
                          onChange={(e) => updateManualMember(index, 'supervisor', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Nome do Supervisor"
                        />
                      </div>
                      
                      {/* Líder */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Líder
                        </label>
                        <input
                          type="text"
                          value={member.lider}
                          onChange={(e) => updateManualMember(index, 'lider', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Nome do Líder"
                        />
                      </div>
                      
                      {/* Marcos do Trilho de Liderança */}
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Marcos do Trilho de Liderança</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              1. Aceitou a Jesus
                            </label>
                            <input
                              type="text"
                              value={member.aceitouJesus}
                              onChange={(e) => updateManualMember(index, 'aceitouJesus', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              2. Discipulado Inicial
                            </label>
                            <input
                              type="text"
                              value={member.discipuladoInicial}
                              onChange={(e) => updateManualMember(index, 'discipuladoInicial', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              3. Batismo
                            </label>
                            <input
                              type="text"
                              value={member.batismo}
                              onChange={(e) => updateManualMember(index, 'batismo', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              4. Membresia
                            </label>
                            <input
                              type="text"
                              value={member.membresia}
                              onChange={(e) => updateManualMember(index, 'membresia', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              5. Treinamento Connect
                            </label>
                            <input
                              type="text"
                              value={member.treinamentoConnect}
                              onChange={(e) => updateManualMember(index, 'treinamentoConnect', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                              placeholder="dd/mm/yyyy"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dados CSV
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Cole aqui o conteúdo do seu arquivo CSV ou digite os dados no formato CSV
              </p>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="nome,email,telefone,endereco,dataNascimento,genero,estadoCivil,connect,supervisor,lider,trilhoLideranca\nJoão Silva,joao@email.com,11999999999,Rua A 123,15/01/1990,Masculino,Solteiro,Connect Alpha,Maria Santos,Pedro Lima,15/03/2023"
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          )}

          {/* Botão Processar */}
          <div className="mt-6">
            <button
              onClick={processData}
              disabled={
                (importMethod === 'csv' && !csvData) || 
                (importMethod === 'file' && !selectedFile) ||
                (importMethod === 'manual' && manualMembers.every(m => !m.nome && !m.email)) || 
                isLoading
              }
              className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Processando...' : 'Visualizar Preview'}
            </button>
          </div>
        </div>

        {/* Erros */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="font-medium text-red-800">Erros Encontrados</h3>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Resultados da Importação */}
        {importResults && (
          <div className={`border rounded-lg p-4 mb-6 ${
            importResults.errors.length === 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center mb-2">
              <CheckCircle className={`h-5 w-5 mr-2 ${
                importResults.errors.length === 0 ? 'text-green-500' : 'text-yellow-500'
              }`} />
              <h3 className={`font-medium ${
                importResults.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'
              }`}>
                Resultado da Importação
              </h3>
            </div>
            <p className={`text-sm mb-2 ${
              importResults.errors.length === 0 ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {importResults.success} membros importados com sucesso
            </p>
            {importResults.errors.length > 0 && (
              <div>
                <p className="text-sm text-yellow-700 mb-2">
                  {importResults.errors.length} erros encontrados:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {importResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <Modal isOpen={showPreview} onClose={() => setShowPreview(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Preview da Importação
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              {parsedMembers.length} membros serão importados:
            </p>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Telefone
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Connect
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedMembers.map((member, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {member.nome}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {member.email}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {member.telefone}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {member.connect}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={importMembers}
                disabled={isLoading}
                className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BulkImportPage;