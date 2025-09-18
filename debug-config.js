// Debug Firebase Configuration
import { firebaseConfig, db, appId } from './src/firebaseConfig.js';
import { collection, getDocs } from 'firebase/firestore';

console.log('=== FIREBASE CONFIG DEBUG ===');
console.log('Firebase Config:', firebaseConfig);
console.log('App ID:', appId);
console.log('Database instance:', db);

// Test basic connection
async function testConnection() {
  try {
    console.log('Testing Firestore connection...');
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    console.log('Connection successful! Test collection size:', snapshot.size);
    
    // Test members collection
    const membersCollection = collection(db, `apps/${appId}/members`);
    const membersSnapshot = await getDocs(membersCollection);
    console.log('Members collection size:', membersSnapshot.size);
    
    membersSnapshot.forEach(doc => {
      console.log('Member doc:', doc.id, doc.data());
    });
    
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();