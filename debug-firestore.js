// Script para debug do Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBOKKlhJJGJJGJJGJJGJJGJJGJJGJJGJJG",
  authDomain: "tenda-church-app.firebaseapp.com",
  projectId: "tenda-church-app",
  storageBucket: "tenda-church-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = 'tenda-church-app';

async function debugMembers() {
  try {
    console.log('Verificando coleção:', `artifacts/${appId}/public/data/members`);
    
    const membersCollection = collection(db, `artifacts/${appId}/public/data/members`);
    const querySnapshot = await getDocs(membersCollection);
    
    console.log('Total de documentos encontrados:', querySnapshot.size);
    
    querySnapshot.docs.forEach((doc, index) => {
      console.log(`Documento ${index + 1}:`, {
        id: doc.id,
        data: doc.data()
      });
    });
    
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
  }
}

debugMembers();