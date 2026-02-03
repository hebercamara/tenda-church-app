import React, { useState } from 'react';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { Upload, Download, Users, AlertCircle, CheckCircle, FileText, Plus, Eye, Trash2, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { convertBrazilianDateToISO } from '../utils/dateUtils';
import * as XLSX from 'xlsx';

import DuplicateMemberModal from '../components/DuplicateMemberModal';

const BulkImportPage = ({ allMembers = [], allConnects = [], areNamesSimilar }) => {
  const { user, isAdmin } = useAuthStore();
  const [importMethod, setImportMethod] = useState('manual'); // 'manual', 'csv' ou 'file'
  const [csvData, setCsvData] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Seleção global de Connect para a importação
  const [defaultConnectId, setDefaultConnectId] = useState('');
  // Quando marcado, aplica o Connect selecionado a TODOS os registros
  const [applyConnectToAll, setApplyConnectToAll] = useState(false);

  const [manualMembers, setManualMembers] = useState([{
    nome: '',
    conhecidoPor: '',
    email: '',
    telefone: '',
    endereco: '',
    bairro: '',
    municipio: '',
    cep: '',
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
  // Overrides de Connect por linha (index original -> connectId)
  const [rowConnectOverrides, setRowConnectOverrides] = useState({});

  // Estado para verificação de duplicatas antes da importação
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatesQueue, setDuplicatesQueue] = useState([]); // [{ existingMember, newMemberData, index }]
  const [currentDuplicateIdx, setCurrentDuplicateIdx] = useState(0);
  const [indicesToSkip, setIndicesToSkip] = useState(new Set());



  // Template CSV para download
  const csvTemplate = `nome,conhecidoPor,email,telefone,endereco,bairro,municipio,cep,dataNascimento,genero,estadoCivil,connect,supervisor,lider,aceitouJesus,discipuladoInicial,batismo,membresia,treinamentoConnect
João Silva,João,joao@email.com,11999999999,"Rua das Flores, 123",Centro,São Paulo,01234-567,15/01/1990,Masculino,Solteiro,Connect Alpha,Maria Santos,Pedro Lima,15/01/2023,20/02/2023,10/03/2023,15/04/2023,20/05/2023
Maria Santos,Maria,maria@email.com,11888888888,"Av. Principal, 456",Vila Nova,Rio de Janeiro,98765-432,20/05/1985,Feminino,Casada,Connect Beta,Ana Costa,Carlos Oliveira,10/01/2022,15/02/2022,05/03/2022,20/04/2022,25/05/2022`;

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
        'nome', 'conhecidoPor', 'email', 'telefone', 'endereco', 'bairro', 'municipio', 'cep', 'dataNascimento', 'genero', 
        'estadoCivil', 'connect', 'supervisor', 'lider', 'aceitouJesus', 
        'discipuladoInicial', 'batismo', 'membresia', 'treinamentoConnect'
      ],
      [
        'João Silva', 'João', 'joao@email.com', '11999999999', 'Rua das Flores, 123', 'Centro', 'São Paulo', '01234-567',
        '15/03/1990', 'Masculino', 'Casado', 'Connect Alpha', 'Maria Santos', 
        'Pedro Costa', '10/01/2020', '15/02/2020', '20/06/2020', '10/12/2020', '05/03/2021'
      ],
      [
        'Maria Oliveira', 'Maria', 'maria@email.com', '11888888888', 'Av. Principal, 456', 'Vila Nova', 'Rio de Janeiro', '98765-432',
        '22/07/1985', 'Feminino', 'Solteira', 'Connect Beta', 'João Silva', 
        'Ana Lima', '05/05/2019', '10/06/2019', '15/09/2019', '20/01/2020', '25/04/2020'
      ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Definir larguras das colunas
    const colWidths = [
      { wch: 15 }, // nome
      { wch: 15 }, // conhecidoPor
      { wch: 25 }, // email
      { wch: 15 }, // telefone
      { wch: 30 }, // endereco
      { wch: 15 }, // bairro
      { wch: 15 }, // municipio
      { wch: 12 }, // cep
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
        // Email e telefone são opcionais
        
        if (member.nome.trim()) {
          const dataNascimento = member.dataNascimento ? convertBrazilianDateToISO(member.dataNascimento) : '';
          const aceitouJesus = member.aceitouJesus ? convertBrazilianDateToISO(member.aceitouJesus) : '';
          const discipuladoInicial = member.discipuladoInicial ? convertBrazilianDateToISO(member.discipuladoInicial) : '';
          const batismo = member.batismo ? convertBrazilianDateToISO(member.batismo) : '';
          const membresia = member.membresia ? convertBrazilianDateToISO(member.membresia) : '';
          const treinamentoConnect = member.treinamentoConnect ? convertBrazilianDateToISO(member.treinamentoConnect) : '';
          
          // Definir conhecidoPor com fallback para primeiro nome
          const conhecidoPor = member.conhecidoPor.trim() || member.nome.trim().split(' ')[0];
          
          members.push({
            nome: member.nome.trim(),
            knownBy: conhecidoPor,
            email: member.email.trim(),
            telefone: member.telefone.trim(),
            endereco: member.endereco.trim(),
            bairro: member.bairro ? member.bairro.trim() : '',
            municipio: member.municipio ? member.municipio.trim() : '',
            cep: member.cep ? member.cep.trim() : '',
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
            'first name': 'firstNameTemp',
            'firstname': 'firstNameTemp',
            'guest first name': 'firstNameTemp',
            'guest_first_name': 'firstNameTemp',
            'last name': 'lastNameTemp',
            'lastname': 'lastNameTemp',
            'guest last name': 'lastNameTemp',
            'guest_last_name': 'lastNameTemp',
            'conhecidopor': 'conhecidoPor',
            'conhecido_por': 'conhecidoPor',
            'conhecido por': 'conhecidoPor',
            'known_by': 'conhecidoPor',
            'knownby': 'conhecidoPor',
            'email': 'email',
            'telefone': 'telefone',
            'phone': 'telefone',
            'phone number': 'telefone',
            'endereco': 'endereco',
            'endereço': 'endereco',
            'address': 'endereco',
            'bairro': 'bairro',
            'neighborhood': 'bairro',
            'municipio': 'municipio',
            'município': 'municipio',
            'city': 'municipio',
            'cidade': 'municipio',
            'cep': 'cep',
            'zipcode': 'cep',
            'zip_code': 'cep',
            'postal_code': 'cep',
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
            'faz parte de qual connect?': 'connect',
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
              
              // Após mapear valores, combinar primeiro/sobrenome se necessário
              if (!member.nome) {
                const first = member.firstNameTemp || '';
                const last = member.lastNameTemp || '';
                const full = `${first} ${last}`.trim();
                if (full) member.nome = full;
              }
              delete member.firstNameTemp;
              delete member.lastNameTemp;
              
              // Criar objeto milestonesData a partir dos campos temporários
              member.milestonesData = {
                acceptedJesus: member.aceitouJesus ? { completed: true, date: member.aceitouJesus } : { completed: false, date: null },
                initialDiscipleship: member.discipuladoInicial ? { completed: true, date: member.discipuladoInicial } : { completed: false, date: null },
                baptism: member.batismo ? { completed: true, date: member.batismo } : { completed: false, date: null },
                membership: member.membresia ? { completed: true, date: member.membresia } : { completed: false, date: null },
                connectTraining: member.treinamentoConnect ? { completed: true, date: member.treinamentoConnect } : { completed: false, date: null }
              };
              
              // Definir knownBy com fallback para primeiro nome
              const conhecidoPor = member.conhecidoPor || (member.nome ? member.nome.split(' ')[0] : '');
              member.knownBy = conhecidoPor;
              
              // Remover campos temporários
              delete member.aceitouJesus;
              delete member.discipuladoInicial;
              delete member.batismo;
              delete member.membresia;
              delete member.treinamentoConnect;
              delete member.conhecidoPor;
              
              // Validação básica - apenas nome é obrigatório
              if (!member.nome || member.nome.trim() === '') {
                errors.push(`Linha ${i + 1}: Nome é obrigatório`);
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

  // Helpers para CSV/TSV: normalização de cabeçalhos, detecção de delimitador e split respeitando aspas
  const normalizeHeader = (h) => (
    h
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/\?/g, '')
      .replace(/[^a-z0-9]+/g, '_') // substitui espaços/pontuação por _
  );

  const detectDelimiter = (line) => {
    const counts = {
      '\t': (line.match(/\t/g) || []).length,
      ';': (line.match(/;/g) || []).length,
      ',': (line.match(/,/g) || []).length,
    };
    const delim = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ',';
    return counts[delim] > 0 ? delim : ',';
  };

  const smartSplit = (line, delimiter) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // pula a aspas de escape
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
  };

  // Parser para CSV/TSV com cabeçalhos variados
  const parseCsvData = (csvText) => {
    const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return { members: [], errors: ['Arquivo vazio'] };

    const delimiter = detectDelimiter(lines[0]);
    const headersRaw = smartSplit(lines[0], delimiter);
    const headers = headersRaw.map(h => normalizeHeader(h));

    const members = [];
    const errors = [];

    const fieldMap = {
      'nome': 'nome',
      'name': 'nome',
      'first_name': 'firstName',
      'last_name': 'lastName',
      'guest_first_name': 'firstName',
      'guest_last_name': 'lastName',
      'email': 'email',
      'e_mail': 'email',
      'telefone': 'telefone',
      'phone': 'telefone',
      'phone_number': 'telefone',
      'address': 'endereco',
      'endereco': 'endereco',
      'endereco_1': 'endereco',
      'endereco_2': 'endereco',
      'data_nascimento': 'dataNascimento',
      'data_de_nascimento': 'dataNascimento',
      'birthdate': 'dataNascimento',
      'connect': 'connect',
      'faz_parte_de_qual_connect': 'connect',
      'connect_name': 'connect',
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;
      const values = smartSplit(line, delimiter).map(v => v.trim());

      const member = {
        dataRegistro: new Date(),
        registradoPor: user?.email || 'Sistema'
      };

      headers.forEach((header, index) => {
        const field = fieldMap[header];
        const raw = values[index];
        if (!field || raw === undefined) return;

        if (field === 'telefone') {
          member.telefone = (raw || '').replace(/[^0-9+]/g, '');
        } else if (field === 'dataNascimento') {
          const v = raw || '';
          let iso = v;
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
            iso = convertBrazilianDateToISO(v);
          } else if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
            iso = v;
          }
          member.dataNascimento = iso;
        } else if (field === 'firstName') {
          member.firstName = raw;
        } else if (field === 'lastName') {
          member.lastName = raw;
        } else {
          member[field] = raw;
        }
      });

      if (!member.nome) {
        const fn = member.firstName || '';
        const ln = member.lastName || '';
        const combined = `${fn} ${ln}`.trim();
        if (combined.length > 0) member.nome = combined;
      }

      member.milestonesData = {
        acceptedJesus: member.aceitouJesus ? { completed: true, date: member.aceitouJesus } : { completed: false, date: null },
        initialDiscipleship: member.discipuladoInicial ? { completed: true, date: member.discipuladoInicial } : { completed: false, date: null },
        baptism: member.batismo ? { completed: true, date: member.batismo } : { completed: false, date: null },
        membership: member.membresia ? { completed: true, date: member.membresia } : { completed: false, date: null },
        connectTraining: member.treinamentoConnect ? { completed: true, date: member.treinamentoConnect } : { completed: false, date: null },
      };

      const conhecidoPor = member.conhecidoPor || (member.nome ? member.nome.split(' ')[0] : '');
      member.knownBy = conhecidoPor;

      delete member.aceitouJesus;
      delete member.discipuladoInicial;
      delete member.batismo;
      delete member.membresia;
      delete member.treinamentoConnect;
      delete member.conhecidoPor;
      delete member.firstName;
      delete member.lastName;

      if (!member.nome || member.nome.trim() === '') {
        errors.push(`Linha ${i + 1}: Nome é obrigatório`);
      } else {
        members.push(member);
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
        const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();
        if (ext === 'csv') {
          const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Erro ao ler o arquivo CSV'));
            reader.readAsText(selectedFile, 'utf-8');
          });
          result = parseCsvData(text);
        } else {
          result = await parseExcelFile(selectedFile);
        }
      } else {
        result = parseManualData();
      }

      // Guardar o índice original para permitir override e controle de duplicatas
      const withOriginalIndex = result.members.map((m, i) => ({ ...m, _originalIndex: i }));
      setParsedMembers(withOriginalIndex);
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
      conhecidoPor: '',
      email: '',
      telefone: '',
      endereco: '',
      bairro: '',
      municipio: '',
      cep: '',
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
  const importMembers = async (membersToImport = null) => {
    const effectiveMembers = Array.isArray(membersToImport) ? membersToImport : parsedMembers;
    if (!effectiveMembers || effectiveMembers.length === 0) return;

    setIsLoading(true);
    const batch = writeBatch(db);
    const results = { success: 0, errors: [] };

    try {
      for (let i = 0; i < effectiveMembers.length; i++) {
        const member = effectiveMembers[i];
        try {
          // Converter campos de endereço para o formato do Firebase
          // Resolve o connectId final do membro de acordo com a seleção global e tentativa de correspondência por nome
          const resolveConnectIdForMember = (m) => {
            const originalIndex = typeof m._originalIndex === 'number' ? m._originalIndex : null;
            // 0) Se houver override por linha, usar
            if (originalIndex !== null && rowConnectOverrides[originalIndex]) {
              return rowConnectOverrides[originalIndex];
            }
            // 1) Se usuário escolheu aplicar a todos e existe um Connect selecionado
            if (applyConnectToAll && defaultConnectId) return defaultConnectId;

            // 2) Se o registro já possui connectId definido
            if (m.connectId) return m.connectId;

            // 3) Se veio um campo "connect" (nome ou número), tentar mapear para um Connect existente
            if (m.connect && Array.isArray(allConnects) && allConnects.length > 0) {
              const raw = String(m.connect).trim();
              // Tentar igualdade direta por id, nome ou número
              const direct = allConnects.find(c => c.id === raw || c.name === raw || String(c.number) === raw);
              if (direct) return direct.id;

              // Tentar por similaridade de nome (se disponível) e por inclusão do número no texto
              let candidate = null;
              let threshold = 0.85;
              if (typeof areNamesSimilar === 'function') {
                for (const c of allConnects) {
                  try {
                    if (areNamesSimilar(raw, c.name, threshold)) { candidate = c; break; }
                  } catch (_) { /* noop */ }
                }
              }
              if (!candidate) {
                const byNumber = allConnects.find(c => raw.toLowerCase().includes(String(c.number).toLowerCase()));
                if (byNumber) candidate = byNumber;
              }
              return candidate ? candidate.id : '';
            }

            // 4) Se existe um Connect padrão e modo "preencher em branco" (checkbox desmarcado)
            if (!applyConnectToAll && defaultConnectId) return defaultConnectId;

            return '';
          };

          const finalConnectId = resolveConnectIdForMember(member);

          const memberData = {
            ...member,
            name: member.nome,
            street: member.endereco || '',
            neighborhood: member.bairro || '',
            city: member.municipio || '',
            zipCode: member.cep || '',
            phone: member.telefone || '',
            dob: member.dataNascimento || '',
            gender: member.genero || '',
            maritalStatus: member.estadoCivil || '',
            connectId: finalConnectId,
            milestones: member.milestonesData || {}
          };
          
          // Remover campos antigos
          delete memberData.nome;
          delete memberData.endereco;
          delete memberData.bairro;
          delete memberData.municipio;
          delete memberData.cep;
          delete memberData.telefone;
          delete memberData.dataNascimento;
          delete memberData.genero;
          delete memberData.estadoCivil;
          delete memberData.connect;
          delete memberData.supervisor;
          delete memberData.lider;
          delete memberData.milestonesData;
          
          const docRef = doc(collection(db, `artifacts/${appId}/public/data/members`));
          batch.set(docRef, memberData);
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

  // Handler para alterar o Connect de uma linha no preview
  const handleRowConnectChange = (originalIndex, connectId) => {
    setRowConnectOverrides(prev => ({ ...prev, [originalIndex]: connectId }));
  };

  // Sugerir ConnectId para preview quando não há override
  const suggestConnectIdForMember = (m) => {
    if (applyConnectToAll && defaultConnectId) return defaultConnectId;
    // reaproveitar lógica de resolução sem considerar overrides
    const temp = resolveConnectIdForMemberNoOverrides(m);
    return temp;
  };

  // Versão sem overrides (utilitário para preview)
  const resolveConnectIdForMemberNoOverrides = (m) => {
    // 1) já possui connectId
    if (m.connectId) return m.connectId;
    // 2) tentar mapear a partir do campo connect
    if (m.connect && Array.isArray(allConnects) && allConnects.length > 0) {
      const raw = String(m.connect).trim();
      const direct = allConnects.find(c => c.id === raw || c.name === raw || String(c.number) === raw);
      if (direct) return direct.id;
      let candidate = null;
      let threshold = 0.85;
      if (typeof areNamesSimilar === 'function') {
        for (const c of allConnects) {
          try {
            if (areNamesSimilar(raw, c.name, threshold)) { candidate = c; break; }
          } catch (_) { /* noop */ }
        }
      }
      if (!candidate) {
        const byNumber = allConnects.find(c => raw.toLowerCase().includes(String(c.number).toLowerCase()));
        if (byNumber) candidate = byNumber;
      }
      return candidate ? candidate.id : '';
    }
    // 3) usar default quando disponível (preencher em branco)
    if (defaultConnectId) return defaultConnectId;
    return '';
  };

  // Encontrar possível duplicata para um membro usando a mesma lógica do cadastro individual
  const findPotentialDuplicate = (member) => {
    try {
      const SIMILARITY_THRESHOLD = 0.8;
      const newMemberData = {
        name: (member?.nome || '').trim(),
        email: (member?.email || '').toLowerCase().trim(),
        phone: (member?.telefone || '').replace(/\D/g, ''),
        dob: member?.dataNascimento || ''
      };
      let potentialDuplicate = null;
      for (const existingMember of allMembers || []) {
        if (!existingMember?.name) continue;
        const existingEmail = existingMember.email?.toLowerCase().trim();
        const existingPhone = existingMember.phone?.replace(/\D/g, '');
        const existingDob = existingMember.dob;
        const isEmailMatch = newMemberData.email && newMemberData.email === existingEmail;
        const isPhoneMatch = newMemberData.phone && newMemberData.phone === existingPhone;
        const isDobMatch = newMemberData.dob && newMemberData.dob === existingDob;
        if (isEmailMatch || isPhoneMatch || isDobMatch) {
          const similar = typeof areNamesSimilar === 'function' ? areNamesSimilar(newMemberData.name, existingMember.name, SIMILARITY_THRESHOLD) : false;
          if (similar) {
            potentialDuplicate = existingMember;
            break;
          }
        }
      }
      return potentialDuplicate ? { existingMember: potentialDuplicate, newMemberData } : null;
    } catch (_) {
      return null;
    }
  };

  // Preparar importação verificando duplicatas e abrindo fluxo de confirmação
  const prepareImportWithDuplicateCheck = () => {
    if (parsedMembers.length === 0) return;
    const queue = [];
    parsedMembers.forEach((m, idx) => {
      const dup = findPotentialDuplicate(m);
      if (dup) queue.push({ ...dup, index: idx });
    });
    if (queue.length > 0) {
      setDuplicatesQueue(queue);
      setCurrentDuplicateIdx(0);
      setDuplicateModalOpen(true);
    } else {
      importMembers(parsedMembers);
    }
  };

  const handleConfirmDuplicate = () => {
    // Usuário confirmou que É a mesma pessoa -> pular este índice na importação
    const current = duplicatesQueue[currentDuplicateIdx];
    const newSet = new Set(indicesToSkip);
    newSet.add(current.index);
    setIndicesToSkip(newSet);
    advanceDuplicateFlow();
  };

  const handleRejectDuplicate = () => {
    // Usuário rejeitou duplicata -> importar normalmente este índice
    advanceDuplicateFlow();
  };

  const advanceDuplicateFlow = () => {
    const nextIdx = currentDuplicateIdx + 1;
    if (nextIdx < duplicatesQueue.length) {
      setCurrentDuplicateIdx(nextIdx);
    } else {
      setDuplicateModalOpen(false);
      // Filtrar membros que NÃO estão marcados para pular
      const membersToImport = parsedMembers.filter((_, idx) => !indicesToSkip.has(idx));
      importMembers(membersToImport);
      // Reset state
      setIndicesToSkip(new Set());
      setDuplicatesQueue([]);
      setCurrentDuplicateIdx(0);
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

  // Função para remover duplicatas
  const removeDuplicates = async () => {
    if (!window.confirm('Esta ação irá remover membros duplicados (com todos os campos iguais). Deseja continuar?')) {
      return;
    }

    setIsLoading(true);
    try {
      const membersCollection = collection(db, `artifacts/${appId}/public/data/members`);
      const querySnapshot = await getDocs(membersCollection);
      const allMembers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const duplicates = [];
      const seen = new Map();
      
      allMembers.forEach(member => {
        const key = JSON.stringify({
          name: member.name,
          email: member.email,
          phone: member.phone,
          connectId: member.connectId
        });
        
        if (seen.has(key)) {
          duplicates.push(member.id);
        } else {
          seen.set(key, member.id);
        }
      });
      
      if (duplicates.length > 0) {
        const batch = writeBatch(db);
        duplicates.forEach(id => {
          const docRef = doc(db, `artifacts/${appId}/public/data/members`, id);
          batch.delete(docRef);
        });
        
        await batch.commit();
        alert(`${duplicates.length} membros duplicados foram removidos.`);
      } else {
        alert('Nenhuma duplicata encontrada.');
      }
    } catch (error) {
      console.error('Erro ao remover duplicatas:', error);
      alert('Erro ao remover duplicatas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };



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
          <div className="mt-4">
            <button
              onClick={removeDuplicates}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Trash2 size={16} />
              <span>Remover Duplicatas</span>
            </button>
          </div>
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
                      
                      {/* Conhecido por */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Conhecido por
                        </label>
                        <input
                          type="text"
                          value={member.conhecidoPor}
                          onChange={(e) => updateManualMember(index, 'conhecidoPor', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Como a pessoa é conhecida (opcional)"
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
                      
                      {/* Endereço (Rua e Número) */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Endereço (Rua e Número)
                        </label>
                        <input
                          type="text"
                          value={member.endereco}
                          onChange={(e) => updateManualMember(index, 'endereco', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Rua das Flores, 123"
                        />
                      </div>
                      
                      {/* Bairro */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={member.bairro}
                          onChange={(e) => updateManualMember(index, 'bairro', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Centro"
                        />
                      </div>
                      
                      {/* Município */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Município
                        </label>
                        <input
                          type="text"
                          value={member.municipio}
                          onChange={(e) => updateManualMember(index, 'municipio', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="São Paulo"
                        />
                      </div>
                      
                      {/* CEP */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CEP
                        </label>
                        <input
                          type="text"
                          value={member.cep}
                          onChange={(e) => updateManualMember(index, 'cep', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="01234-567"
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

          {/* Configuração de Connect padrão */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Connect padrão para esta importação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar Connect</label>
                <select
                  value={defaultConnectId}
                  onChange={(e) => setDefaultConnectId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Nenhum (manter conforme CSV)</option>
                  {Array.isArray(allConnects) && allConnects.map((c) => (
                    <option key={c.id} value={c.id}>{`${c.number ? c.number + ' - ' : ''}${c.name}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center mt-2 md:mt-6">
                <input
                  id="applyConnectToAll"
                  type="checkbox"
                  checked={applyConnectToAll}
                  onChange={(e) => setApplyConnectToAll(e.target.checked)}
                  className="h-4 w-4 text-red-600 border-gray-300 rounded"
                />
                <label htmlFor="applyConnectToAll" className="ml-2 text-sm text-gray-700">
                  Aplicar o Connect selecionado a todos os registros (se desmarcado, será usado apenas quando o CSV não trouxer Connect)
                </label>
              </div>
            </div>
          </div>

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
        <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Preview da Importação">
          <div className="p-6">

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
                  {parsedMembers.map((member) => (
                    <tr key={member._originalIndex}>
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
                        <select
                          value={
                            rowConnectOverrides[member._originalIndex] ||
                            suggestConnectIdForMember(member) || ''
                          }
                          onChange={(e) => handleRowConnectChange(member._originalIndex, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Selecionar...</option>
                          {Array.isArray(allConnects) && allConnects.map((c) => (
                            <option key={c.id} value={c.id}>{`${c.number ? c.number + ' - ' : ''}${c.name}`}</option>
                          ))}
                        </select>
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
                onClick={prepareImportWithDuplicateCheck}
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
      {duplicateModalOpen && duplicatesQueue[currentDuplicateIdx] && (
        <DuplicateMemberModal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          existingMember={duplicatesQueue[currentDuplicateIdx].existingMember}
          newMemberData={duplicatesQueue[currentDuplicateIdx].newMemberData}
          onConfirm={handleConfirmDuplicate}
          onReject={handleRejectDuplicate}
        />
      )}
    </div>
  );
};

export default BulkImportPage;