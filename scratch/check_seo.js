
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let serviceAccount;

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.error("Service account file not found");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
db.collection('settings').doc('seo').get()
  .then(doc => {
    if (!doc.exists) {
      console.log('No SEO settings found in DB.');
    } else {
      console.log('DB SEO Settings:', JSON.stringify(doc.data(), null, 2));
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error getting settings', err);
    process.exit(1);
  });
