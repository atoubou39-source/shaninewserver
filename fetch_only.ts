
import xmlrpc from "xmlrpc";
import dotenv from "dotenv";

dotenv.config();

const odooConfig = {
  url: process.env.ODOO_URL || "",
  db: process.env.ODOO_DB || "",
  apiKey: (process.env.ODOO_API_KEY || "").trim(),
  username: (process.env.ODOO_USERNAME || "").trim(),
  password: (process.env.ODOO_PASSWORD || "").trim(),
};

const getOdooCredential = () => odooConfig.apiKey || odooConfig.password;

const callOdoo = (service: string, method: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
      const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
      const isSecure = url.protocol === "https:";
      const client = isSecure 
        ? xmlrpc.createSecureClient({ host: url.hostname, port: 443, path: "/xmlrpc/2/" + service, rejectUnauthorized: false })
        : xmlrpc.createClient({ host: url.hostname, port: 80, path: "/xmlrpc/2/" + service });

      client.methodCall(method, args, (err: any, value: any) => {
        if (err) reject(err);
        else resolve(value);
      });
    } catch (e) { reject(e); }
  });
};

async function fetch() {
  try {
    const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, getOdooCredential(), {});
    if (!uid) throw new Error("Auth failed");
    
    const products = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "product.template", "search_read", 
      [[["sale_ok", "=", true]]], 
      { fields: ["id", "name", "list_price", "description_sale"], limit: 20 }
    );
    
    console.log(JSON.stringify(products, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fetch();
