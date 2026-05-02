
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import dotenv from "dotenv";
import xmlrpc from "xmlrpc";

dotenv.config();

// Odoo Configuration
const odooConfig = {
  url: process.env.ODOO_URL || "",
  db: process.env.ODOO_DB || "",
  apiKey: (process.env.ODOO_API_KEY || "").trim(),
  username: (process.env.ODOO_USERNAME || "").trim(),
  password: (process.env.ODOO_PASSWORD || "").trim(),
};

const getOdooCredential = () => odooConfig.apiKey || odooConfig.password;

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

const callOdoo = (service: string, method: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!odooConfig.url) return reject(new Error("Odoo URL is not configured"));
    
    // 15s timeout for sync calls
    const timer = setTimeout(() => {
      reject(new Error(`Odoo timeout for ${service}/${method}`));
    }, 15000);

    try {
      const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
      const urlString = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      const url = new URL(urlString);
      
      const isSecure = url.protocol === "https:";
      const baseDir = url.pathname === "/" ? "" : url.pathname;
      const clientPath = `${baseDir}/xmlrpc/2/${service}`.replace(/\/+/g, "/");

      const options = { 
        host: url.hostname, 
        port: parseInt(url.port) || (isSecure ? 443 : 80), 
        path: clientPath,
        rejectUnauthorized: false,
      };

      const client = isSecure ? xmlrpc.createSecureClient(options) : xmlrpc.createClient(options);

      client.methodCall(method, args, (err: any, value: any) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(value);
      });
    } catch (e: any) {
      clearTimeout(timer);
      reject(e);
    }
  });
};

async function sync() {
  console.log("Starting Optimized Odoo to Firestore sync...");
  
  try {
    const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, getOdooCredential(), {});
    if (!uid) throw new Error("Odoo authentication failed");

    console.log("Fetching products (using image_128 for better performance)...");
    const products = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "product.template", "search_read", [
      [["sale_ok", "=", true]]
    ], {
      fields: ["name", "list_price", "description_sale", "image_128"], // Using image_128 instead of 1920
      limit: 1000 // Limit to avoid memory issues
    });

    console.log(`Found ${products.length} products. Syncing in batches...`);

    // Firestore Batch Processing (Max 500 per batch)
    const BATCH_SIZE = 50; // Small batches for better stability
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = products.slice(i, i + BATCH_SIZE);

      for (const op of chunk) {
        let imageUrl = "https://picsum.photos/seed/product/400/400";
        if (op.image_128) {
          const base64Str = op.image_128.toString().replace(/\s/g, '');
          imageUrl = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
        }

        const productData = {
          id: op.id,
          name: op.name,
          description: op.description_sale || "Imported from Odoo ERP system.",
          price: `⃁ ${(op.list_price || 0).toLocaleString()}`,
          image: imageUrl,
          isOdoo: true,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        const docRef = db.collection("products").doc(String(op.id));
        batch.set(docRef, productData, { merge: true });
      }

      await batch.commit();
      console.log(`Synced batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} items)`);
    }

    console.log("Sync complete!");
  } catch (error: any) {
    console.error("Sync failed:", error.message);
    process.exitCode = 1;
  }
}

sync();
