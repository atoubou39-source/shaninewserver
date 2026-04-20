
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import dotenv from "dotenv";
import xmlrpc from "xmlrpc";

dotenv.config();

// Odoo Configuration
const odooConfig = {
  url: process.env.ODOO_URL || "",
  db: process.env.ODOO_DB || "",
  username: process.env.ODOO_USERNAME || "",
  password: process.env.ODOO_PASSWORD || "",
};

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
        if (err) reject(err);
        else resolve(value);
      });
    } catch (e: any) {
      reject(e);
    }
  });
};

async function sync() {
  console.log("Starting Odoo to Firestore sync...");
  
  try {
    console.log("Authenticating with Odoo...");
    const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, odooConfig.password, {});
    
    if (!uid) {
      throw new Error("Odoo authentication failed");
    }
    console.log("Authenticated UID:", uid);

    console.log("Fetching products from Odoo...");
    const products = await callOdoo("object", "execute_kw", odooConfig.db, uid, odooConfig.password, "product.template", "search_read", [
      [["sale_ok", "=", true]]
    ], {
      fields: ["name", "list_price", "description_sale", "image_1920"]
    });

    console.log(`Found ${products.length} products. Syncing to Firestore...`);

    for (const op of products) {
      let imageUrl = "https://picsum.photos/seed/product/400/400";
      if (op.image_1920) {
        const base64Str = op.image_1920.toString().replace(/\s/g, '');
        imageUrl = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
      }

      const productData = {
        id: op.id,
        name: op.name,
        description: op.description_sale || "Imported from Odoo ERP system.",
        price: `SAR ${(op.list_price || 0).toLocaleString()}`,
        image: imageUrl,
        isOdoo: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Use Odoo ID as Firestore document ID to avoid duplicates
      await db.collection("products").doc(String(op.id)).set(productData, { merge: true });
      console.log(`Synced: ${op.name}`);
    }

    console.log("Sync complete!");
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error("Sync failed:", error);

    if (message.includes("Could not load the default credentials")) {
      console.error(
        "Firebase credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS in .env to your service account JSON absolute path."
      );
    }

    process.exitCode = 1;
  }
}

sync();
