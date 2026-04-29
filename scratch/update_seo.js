
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

const newSeo = {
  "home": {
    "title": "Hakkal Trading Company | شركة حقال للتجارة",
    "description": "شركة حقال للتجارة - وجهتك الأولى للمنتجات عالية الجودة والأدوات الصحية الموثوقة منذ عام 2003.",
    "keywords": "حقال, شركة حقال للتجارة, أدوات صحية, جودة, متجر الكتروني"
  },
  "collection": {
    "title": "المجموعة | Hakkal Trading Company",
    "description": "استكشف مجموعتنا الفاخرة من الأدوات الصحية والمنتجات عالية الجودة.",
    "keywords": "مجموعة المنتجات, أدوات صحية, حقال"
  },
  "about": {
    "title": "من نحن | Hakkal Trading Company",
    "description": "تعرف على مسيرة شركة حقال للتجارة والتزامنا بتقديم الأفضل لعملائنا منذ 2003.",
    "keywords": "عن الشركة, تاريخ حقال, الجودة"
  }
};

db.collection('settings').doc('seo').set(newSeo)
  .then(() => {
    console.log('Successfully updated SEO settings in Firestore!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error updating settings', err);
    process.exit(1);
  });
