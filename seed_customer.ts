import admin from "firebase-admin";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function seedCustomer() {
  const customer = {
    odoo_id: 9999, // Dummy ID for manual sync
    name: "Azure Interior",
    email: "azure.Interior24@example.com",
    phone: "(870)-931-0505"
  };

  try {
    console.log(`Syncing customer: ${customer.email}`);
    
    // Create user in Firestore only since Auth API is disabled
    const dummyUid = "manual_" + Math.random().toString(36).slice(2, 10);
    
    await db.collection("users").doc(dummyUid).set({
      facilityName: customer.name,
      phoneNumber: customer.phone,
      email: customer.email.toLowerCase().trim(),
      role: "customer",
      odooPartnerId: customer.odoo_id,
      canLogin: true,
      accountActivated: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("Firestore Sync Complete for registration check!");
  } catch (error) {
    console.error("Seed Error:", error);
  }
}

seedCustomer();
