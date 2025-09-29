// Debug script para verificar carregamento de dados
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Configuração do Firebase (usando valores do .env)
const firebaseConfig = {
  apiKey: "AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "tenda-church-app.firebaseapp.com",
  projectId: "tenda-church-app",
  storageBucket: "tenda-church-app.appspot.com",
  messagingSenderId: "987654321",
  appId: "1:987654321:web:xyz123abc456def789"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = "tenda-church-app";

console.log('=== DEBUG CARREGAMENTO DE DADOS ===');
console.log('Firebase Config:', firebaseConfig);
console.log('App ID:', appId);

async function debugDataLoading() {
  try {
    console.log('\n🔍 Verificando coleções...');
    
    // Verificar membros
    console.log('📂 Verificando membros...');
    const membersPath = `artifacts/${appId}/public/data/members`;
    console.log('Caminho:', membersPath);
    
    const membersCollection = collection(db, membersPath);
    const membersSnapshot = await getDocs(membersCollection);
    console.log('📊 Membros encontrados:', membersSnapshot.size);
    
    // Verificar connects
    console.log('\n📂 Verificando connects...');
    const connectsPath = `artifacts/${appId}/public/data/connects`;
    console.log('Caminho:', connectsPath);
    
    const connectsCollection = collection(db, connectsPath);
    const connectsSnapshot = await getDocs(connectsCollection);
    console.log('📊 Connects encontrados:', connectsSnapshot.size);
    
    // Verificar cursos
    console.log('\n📂 Verificando cursos...');
    const coursesPath = `artifacts/${appId}/public/data/courses`;
    console.log('Caminho:', coursesPath);
    
    const coursesCollection = collection(db, coursesPath);
    const coursesSnapshot = await getDocs(coursesCollection);
    console.log('📊 Cursos encontrados:', coursesSnapshot.size);
    
    // Verificar relatórios
    console.log('\n📂 Verificando relatórios...');
    const reportsPath = `artifacts/${appId}/public/data/connect_reports`;
    console.log('Caminho:', reportsPath);
    
    const reportsCollection = collection(db, reportsPath);
    const reportsSnapshot = await getDocs(reportsCollection);
    console.log('📊 Relatórios encontrados:', reportsSnapshot.size);
    
    console.log('\n✅ Debug concluído!');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

debugDataLoading();