import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json";
import dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function seed() {
  console.log("Seeding accounts...");

  // 1. Admin Account
  const adminEmail = "atoubou39@gmail.com";
  try {
    const user = await auth.getUserByEmail(adminEmail);
    console.log("Admin exists:", user.uid);
  } catch (e) {
    await auth.createUser({
      email: adminEmail,
      password: "AdminPassword123!",
      emailVerified: true
    });
    console.log("Admin created");
  }

  // 2. Demo Customer
  const phone = "966500000000";
  const e164Phone = `+${phone}`;
  const customerEmail = `${phone}@customer.com`;
  
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByPhoneNumber(e164Phone);
    } catch (e) {
       userRecord = await auth.createUser({
        phoneNumber: e164Phone,
        email: customerEmail,
        password: "password123",
        emailVerified: true
      });
      console.log("Customer created");
    }

    await db.collection("users").doc(userRecord.uid).set({
      facilityName: "Demo Restaurant",
      phoneNumber: phone,
      address: "Riyadh, Saudi Arabia",
      email: customerEmail,
      role: 'customer',
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("Customer Firestore record ensured");
  } catch (err) {
    console.error("Customer seed error:", err);
  }

  console.log("Seeding offers...");
  const offerId = "welcome-offer";
  await db.collection("offers").doc(offerId).set({
    title: "مرحباً بك في عالم النكهات!",
    description: "احصل على خصم 15% على طلبك الأول باستخدام الكود أدناه. اكتشف مجموعتنا الفاخرة من التوابل السريلانكية الأصلية.",
    image: "https://i.postimg.cc/rshF2439/6.png",
    code: "WELCOME15",
    active: true,
    createdAt: new Date().toISOString()
  }, { merge: true });

  console.log("Seeding complete.");
}

seed().catch(console.error);
