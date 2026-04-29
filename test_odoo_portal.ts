import xmlrpc from "xmlrpc";

const odooConfig = {
  url: process.env.ODOO_URL || "https://co.haqqal-est.com",
  db: process.env.ODOO_DB || "test",
  apiKey: process.env.ODOO_API_KEY || "b1624329dc9a6ba356f92d9e76eabab105479791",
  username: process.env.ODOO_USERNAME || "aburiyad",
  password: process.env.ODOO_PASSWORD || "test",
};

const getOdooCredential = () => odooConfig.apiKey || odooConfig.password;

const callOdoo = (service: string, method: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
      const urlString = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      const url = new URL(urlString);
      const isSecure = url.protocol === "https:";
      const options = { 
        host: url.hostname, 
        port: parseInt(url.port) || (isSecure ? 443 : 80), 
        path: `${url.pathname === "/" ? "" : url.pathname}/xmlrpc/2/${service}`.replace(/\/+/g, "/"),
        rejectUnauthorized: false
      };
      const client = isSecure ? xmlrpc.createSecureClient(options) : xmlrpc.createClient(options);
      client.methodCall(method, args, (err: any, value: any) => {
        if (err) return reject(err);
        resolve(value);
      });
    } catch (e: any) { reject(e); }
  });
};

async function test() {
  try {
    const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, getOdooCredential(), {});
    console.log("Auth UID:", uid);
    
    // search for an order
    const orders = await callOdoo(
      "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
      "sale.order", "search_read", [[["name", "ilike", "S00101"]]], { fields: ["name", "access_url", "access_token", ], limit: 1 }
    );
    console.log("Order Data:", orders);
  } catch (e) {
    console.error(e);
  }
}
test();
