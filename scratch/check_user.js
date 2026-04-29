
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let serviceAccount;

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.error("Service account file not found at:", serviceAccountPath);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const phone = process.argv[2];
if (!phone) {
  console.log("Usage: node check_user.js <phone>");
  process.exit(1);
}

const db = admin.firestore();
db.collection('users').where('phoneNumber', '==', phone).get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log('No matching documents in Firestore.');
      return;
    }

    snapshot.forEach(doc => {
      console.log('Firestore User:', doc.id, '=>', doc.data());
    });
  })
  .catch(err => {
    console.log('Error getting documents', err);
  });
