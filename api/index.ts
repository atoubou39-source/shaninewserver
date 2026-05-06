const express = require("express");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");
const dotenv = require("dotenv");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const xmlrpc = require("xmlrpc");
import * as authDb from "./auth-db";

dotenv.config();

const app = express();

// ── JWT Configuration ──────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "hakkal-super-secret-jwt-key-2024-change-in-production";
const JWT_EXPIRES_IN = "30d"; // Token valid for 30 days

console.log("[JWT] Auth system initialized (Firebase-free mode)");

// JWT Helper functions
const signToken = (payload: object) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
};

// Auth middleware - verifies JWT from Authorization header
const requireAuth = (req: any, res: any, next: any) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: "Authentication required" });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, error: "Invalid or expired token" });
  req.user = decoded;
  next();
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  requireAuth(req, res, () => {
    if (!req.user?.isAdmin) return res.status(403).json({ success: false, error: "Admin access required" });
    next();
  });
};

// Odoo Configuration
const odooConfig = {
  url: (process.env.ODOO_URL || "https://co.hakkal-est.com").replace(/\/$/, ""),
  db: process.env.ODOO_DB || "test",
  apiKey: process.env.ODOO_API_KEY || "b1624329dc9a6ba356f92d9e76eabab105479791",
  username: process.env.ODOO_USERNAME || "aburiyad",
  password: process.env.ODOO_PASSWORD || "test",
  enabled: true // RE-ENABLED AND OPTIMIZED
};

// Simple Auth Cache to prevent constant authentication requests
let odooAuthCache = {
  uid: null,
  timestamp: 0
};
const AUTH_CACHE_DURATION = 1000 * 60 * 30; // Cache UID for 30 minutes

const getOdooCredential = () => odooConfig.apiKey || odooConfig.password;

// Madar SMS Configuration
const madarConfig = {
  token: process.env.MADAR_API_TOKEN,
  senderName: process.env.MADAR_SENDER_NAME || "HAKKAL",
  baseUrl: "https://app.mobile.net.sa/api/v1"
};

const sendMadarSMS = async (number: string, message: string) => {
  if (!madarConfig.token) {
    console.warn("[Madar SMS] Token missing, skipping SMS");
    return { success: false, error: "Token missing" };
  }

  const cleanNumber = sanitizePhone(number);
  const token = madarConfig.token ? madarConfig.token.trim() : "";

  // Debug log (obscured token)
  console.log(`[Madar SMS] Attempting to send to ${cleanNumber}...`);
  console.log(`[Madar SMS] Token: ...${token.substring(token.length - 4)} | Sender: ${madarConfig.senderName}`);

  try {
    const response = await axios.post(`${madarConfig.baseUrl}/send`, {
      number: cleanNumber,
      senderName: madarConfig.senderName,
      messageBody: message,
      sendAtOption: "NOW",
      allow_duplicate: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10s timeout
    });

    console.log("[Madar SMS] Raw Response:", JSON.stringify(response.data));

    // Check for success in response body
    // Madar/Mobile.net.sa often returns { status: "Success", ... } or { code: 200, ... }
    const resData = response.data || {};
    const status = (resData.status || "").toString().toLowerCase();
    const code = (resData.code || "").toString();

    const isSuccess =
      status === "success" ||
      status === "sent" ||
      status === "pending" ||
      code === "200" ||
      resData.success === true ||
      (resData.data && (resData.data.id || resData.data.message?.id));

    if (isSuccess) {
      console.log("[Madar SMS] Success confirmed (or queued)");
      return { success: true, data: response.data };
    }

    // If we have an error message in the body
    const errorMsg = response.data?.message || response.data?.error || "فشل إرسال الرسالة من موفر الخدمة";
    console.error("[Madar SMS] API rejected request:", errorMsg);
    return { success: false, error: errorMsg, debug: JSON.stringify(response.data) };
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error("[Madar SMS] Exception:", JSON.stringify(errorDetail));

    let readableError = "خطأ في الاتصال بمزود الرسائل";
    if (error.response?.data?.message) {
      readableError = error.response.data.message;
    } else if (typeof errorDetail === 'string') {
      readableError = errorDetail;
    }

    return { success: false, error: readableError, debug: JSON.stringify(errorDetail) };
  }
};

const isOdooConfigured = () => {
  if (!odooConfig.enabled) return false;
  const { url, db, username } = odooConfig;
  const credential = getOdooCredential();
  return !!(url && db && username && credential);
};

// Phone Sanitization Helper for Madar and Firebase
const sanitizePhone = (phone: string): string => {
  // Remove all non-digits (spaces, +, -, etc.)
  let clean = phone.replace(/\D/g, "");

  // If it starts with 00966, convert to 966
  if (clean.startsWith("00966")) {
    clean = clean.substring(2);
  }

  // If it starts with 05 and length is 10, convert to 9665...
  if (clean.startsWith("05") && clean.length === 10) {
    clean = "966" + clean.substring(1);
  }
  // If it starts with 5 and length is 9, convert to 9665...
  else if (clean.startsWith("5") && clean.length === 9) {
    clean = "966" + clean;
  }

  // Dedup: if exact double-length (user typed number twice), take first half
  if (clean.length === 24 && clean.startsWith('966')) {
    clean = clean.substring(0, 12);
  }

  // Cap at 12 digits (Saudi number max: 966XXXXXXXXX)
  if (clean.startsWith('966') && clean.length > 12) {
    clean = clean.substring(0, 12);
  }

  return clean;
};

  const ODOO_CALL_TIMEOUT_MS = 30000; // Increased to 30s for Render environment

  const callOdoo = (service, method, ...args) => {
    const start = Date.now();
    console.log(`[Odoo Call] START: ${service}/${method}`, `with ${args.length} arguments`);
    return new Promise((resolve, reject) => {
      if (!isOdooConfigured()) {
        console.error("[Odoo Call] Odoo configuration missing!");
        return reject(new Error("Odoo not configured"));
      }

      // Higher timeout for Render environment
      const timer = setTimeout(() => {
        console.log(`[Odoo Call] [${Date.now() - start}ms] TIMEOUT: ${service}/${method}`);
        reject(new Error(`[Odoo Timeout] Request to ${service}/${method} exceeded ${ODOO_CALL_TIMEOUT_MS}ms`));
      }, ODOO_CALL_TIMEOUT_MS);

      try {
        const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
        const urlString = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        const url = new URL(urlString);
        const isSecure = url.protocol === "https:";

        const options = {
          host: url.hostname,
          port: parseInt(url.port) || (isSecure ? 443 : 80),
          path: `${url.pathname === "/" ? "" : url.pathname}/xmlrpc/2/${service}`.replace(/\/+/g, "/"),
          rejectUnauthorized: false,
          timeout: ODOO_CALL_TIMEOUT_MS,
          headers: {
            'Connection': 'keep-alive'
          }
        };

        // USE HTTPS module for secure connections
        const client = isSecure ? xmlrpc.createSecureClient(options) : xmlrpc.createClient(options);

        client.methodCall(method, args, (err, value) => {
          clearTimeout(timer);
          const duration = Date.now() - start;
          if (err) {
            console.error(`[Odoo Call] [${duration}ms] ERROR: ${service}/${method}:`, err.message);
            // Enhanced error reporting for Render
            if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
              return reject(new Error(`Odoo connection failed (${err.code}). This might be due to server load or network issues.`));
            }
            return reject(err);
          }
          console.log(`[Odoo Call] [${duration}ms] SUCCESS: ${service}/${method}`);
          resolve(value);
        });
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    });
  };

  const authenticateOdoo = async () => {
    const now = Date.now();
    if (odooAuthCache.uid && (now - odooAuthCache.timestamp < AUTH_CACHE_DURATION)) {
      console.log("[Odoo Auth] Using cached UID");
      return odooAuthCache.uid;
    }

    try {
      console.log("[Odoo Auth] Attempting fresh authentication...");
      const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, getOdooCredential(), {});
      if (uid && typeof uid === 'number') {
        console.log(`[Odoo Auth] Success! UID: ${uid}`);
        odooAuthCache = { uid, timestamp: now };
        return uid;
      }
      throw new Error(`Invalid UID returned from Odoo: ${uid}`);
    } catch (err: any) {
      console.error(`[Odoo Auth] Failed: ${err.message}`);
      console.error("[Odoo Auth] Details:", {
        odooUrl: odooConfig.url,
        db: odooConfig.db,
        username: odooConfig.username,
        hasPassword: !!odooConfig.password,
        hasApiKey: !!odooConfig.apiKey
      });
      throw err;
    }
  };

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));


  // Explicit CORS - Dynamic Origin Handling
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // In production, you might want to restrict this to your specific domains
    // For "work everywhere" mode, we reflect the requesting origin
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Health-check endpoint (used by Render for keep-alive pings)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), time: new Date().toISOString() });
  });

  // Diagnostic route to check Odoo configuration status
  app.get("/api/odoo/config-check", (req, res) => {
    res.json({
      url: odooConfig.url || "MISSING",
      db: odooConfig.db || "MISSING",
      username: odooConfig.username || "MISSING",
      hasApiKey: !!odooConfig.apiKey,
      hasPassword: !!odooConfig.password,
      isConfigured: isOdooConfigured(),
      envKeys: Object.keys(process.env).filter(k => k.includes('ODOO') || k.includes('FIREBASE') || k.includes('VITE')),
      vercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV
    });
  });

  // Health check route (Advanced diagnostic)
  app.get("/api/health-check", async (req, res) => {
    const response: any = {
      timestamp: new Date().toISOString(),
      server: "online",
      odoo: {
        configured: isOdooConfigured(),
        url: odooConfig.url,
        db: odooConfig.db,
        username: odooConfig.username,
        hasApiKey: !!odooConfig.apiKey,
        hasPassword: !!odooConfig.password
      },
      tests: {}
    };

    // Test Odoo connection
    try {
      const uid = await authenticateOdoo();
      response.tests.odooAuth = { success: !!uid, uid };
    } catch (e: any) {
      response.tests.odooAuth = { success: false, error: e.message };
    }

    const statusCode = response.tests.odooAuth.success ? 200 : 503;
    res.status(statusCode).json(response);
  });

  // Diagnostic route to check headers
  app.get("/api/debug-headers", (req, res) => {
    res.json({
      headers: req.headers,
      method: req.method,
      url: req.url
    });
  });

  // 1. Authenticate with Odoo
  app.post("/api/auth/verify-odoo-customer", async (req, res) => {
    const { phone, email } = req.body;
    const start = Date.now();

    try {
      req.setTimeout(60000);
      console.log(`[Odoo Verify] START for email: ${email}, phone: ${phone}`);
      console.log(`[Odoo Verify] Request body:`, JSON.stringify(req.body));

      if (!isOdooConfigured()) {
        console.error("[Odoo Verify] Odoo not configured! Config:", {
          url: odooConfig.url,
          db: odooConfig.db,
          username: odooConfig.username,
          hasApiKey: !!odooConfig.apiKey,
          hasPassword: !!odooConfig.password
        });
        return res.status(503).json({ success: false, error: "Odoo service temporarily unavailable" });
      }

      const uid = await authenticateOdoo();

      // Try multiple search strategies
      let customers: any = [];

      // 1. Try Exact Match (Email or Phone)
      let domain: any[] = [];
      if (email && phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        domain = ["|", ["email", "=", email.trim().toLowerCase()], "|", ["phone", "=", cleanPhone], ["mobile", "=", cleanPhone]];
      } else if (email) {
        domain = [["email", "=", email.trim().toLowerCase()]];
      } else if (phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        domain = ["|", ["phone", "=", cleanPhone], ["mobile", "=", cleanPhone]];
      }

      console.log("[Odoo Verify] Strategy 1: Exact Match Search...", JSON.stringify(domain));
      if (domain.length > 0) {
        // Fetch multiple records to find the one with a salesperson if duplicates exist
        customers = await (callOdoo as any)("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search_read", [domain], { limit: 5, order: "write_date desc" });
      }

      // 2. Fallback: Search by Name if no salesperson found yet
      let hasSalesperson = Array.isArray(customers) && customers.some(c => c.user_id && Array.isArray(c.user_id));
      if (!hasSalesperson && customers.length > 0) {
        const nameToSearch = customers[0].name;
        console.log(`[Odoo Verify] Strategy 2: Searching by Name (${nameToSearch}) to find duplicates with salesperson...`);
        const nameDomain = [["name", "=", nameToSearch]];
        const nameResults = await (callOdoo as any)("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search_read", [nameDomain], { limit: 5, order: "write_date desc" });
        if (Array.isArray(nameResults) && nameResults.length > 0) {
          customers = [...customers, ...nameResults];
        }
      }

      if (Array.isArray(customers) && customers.length > 0) {
        // ADVANCED MERGE: Look through all matches to find a salesperson
        let salesperson = null;
        let bestRecord = customers[0];

        for (const cust of customers) {
          const possibleSalesperson = cust.user_id || cust.x_studio_salesperson || cust.salesperson_id || cust.x_salesperson;
          if (possibleSalesperson && Array.isArray(possibleSalesperson)) {
            salesperson = { id: possibleSalesperson[0], name: possibleSalesperson[1] };
            bestRecord = cust;
            break;
          }
        }

        const c = bestRecord;
        console.log(`[Odoo Verify] Customer Verified: ${c.name} (ID: ${c.id}) - Salesperson: ${salesperson ? salesperson.name : "None"}`);

        res.json({
          success: true,
          customer: {
            ...c,
            name: c.display_name || c.name,
            salesperson_id: salesperson ? salesperson.id : null,
            salesperson_name: salesperson ? salesperson.name : "Not Assigned"
          }
        });
      } else {
        console.log(`[Odoo Verify] NO MATCH in ${Date.now() - start}ms`);
        res.json({ success: false, message: "No customer found in Odoo" });
      }
    } catch (error: any) {
      console.error(`[Odoo Verify Error] in ${Date.now() - start}ms:`, error.message);
      console.error("[Odoo Verify Error] Full error:", error);
      const errorMsg = error.message || "Unknown error occurred";
      const displayError = errorMsg.includes('Odoo') ? errorMsg : `Odoo Connection Error: ${errorMsg}`;
      res.status(500).json({ success: false, error: displayError });
    }
  });

  app.get("/api", (req, res) => {
    res.json({ status: "online", message: "Hakkal API Server Running" });
  });

  app.get("/api/version", (req, res) => {
    res.json({ version: "v2.0-advanced-merge" });
  });

  app.post("/api/ping", (req, res) => {
    res.json({ status: "ok", message: "POST connection successful" });
  });

  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/odoo/test-connection", async (req, res) => {
    try {
      const uid = await authenticateOdoo();
      res.json({ success: !!uid, uid });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Debug Customer Data Route
  app.get("/api/odoo/debug-customer", async (req, res) => {
    const { email, phone } = req.query;
    if (!email && !phone) return res.status(400).json({ error: "Email or phone is required" });

    try {
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ error: "Odoo Auth Failed" });

      let domain: any[] = [];
      if (email) domain.push(["email", "=", (email as string).trim()]);
      if (phone) domain.push(["phone", "=", (phone as string).trim()]);

      // Fetch customer with ALL fields
      const customers = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search_read", [domain], { fields: [] });

      if (Array.isArray(customers) && customers.length > 0) {
        const customer = customers[0];
        // Filter out false values for readability
        const cleanData = {};
        Object.keys(customer).forEach(key => {
          if (customer[key] !== false) cleanData[key] = customer[key];
        });

        res.json({
          success: true,
          message: "This is raw data from Odoo. Look for your salesperson name in these fields.",
          fields_count: Object.keys(cleanData).length,
          data: cleanData
        });
      } else {
        res.json({ success: false, message: "No customer found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Product Cache ──────────────────────────────────────────
  let cachedProducts: any[] | null = null;
  let lastCacheUpdate = 0;
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Odoo Product Fetch
  app.get("/api/odoo/products", async (req, res) => {
    try {
      const now = Date.now();
      if (cachedProducts && (now - lastCacheUpdate < CACHE_TTL)) {
        console.log("[Cache] Serving products from in-memory cache");
        return res.json({ success: true, data: cachedProducts });
      }

      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false });

      console.log("[Odoo] Fetching fresh products from ERP...");
      const products = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "product.template", "search_read", [[]], {
        fields: ["id", "name", "list_price", "description_sale", "image_1920"],
        limit: 30
      });

      cachedProducts = products as any[];
      lastCacheUpdate = now;

      res.json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get Order Status by Order Name
  // Get Order Status by Order Name (Comprehensive)
  app.get("/api/odoo/order-status/:orderName", async (req, res) => {
    try {
      const orderName = decodeURIComponent(req.params.orderName);
      console.log(`[Order Status] Fetching status for order: ${orderName}`);

      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      // 1. Search for order by name
      let orders = await callOdoo(
        "object",
        "execute_kw",
        odooConfig.db,
        uid,
        getOdooCredential(),
        "sale.order",
        "search_read",
        [[["name", "=", orderName]]],
        { fields: ["name", "state", "picking_ids", "amount_total", "delivery_status", "invoice_status", "invoice_ids"] }
      );

      // 2. If not found by name, try to find by origin or picking name
      if (!Array.isArray(orders) || orders.length === 0) {
        console.log(`[Order Status] Order ${orderName} not found by name, searching in pickings...`);
        const pickingSearch = await callOdoo(
          "object",
          "execute_kw",
          odooConfig.db,
          uid,
          getOdooCredential(),
          "stock.picking",
          "search_read",
          [["|", ["name", "=", orderName], ["origin", "=", orderName]]],
          { fields: ["sale_id"], limit: 1 }
        );

        if (Array.isArray(pickingSearch) && pickingSearch.length > 0 && pickingSearch[0].sale_id) {
          const saleId = pickingSearch[0].sale_id[0];
          console.log(`[Order Status] Found sale_id ${saleId} via picking search`);
          orders = await callOdoo(
            "object",
            "execute_kw",
            odooConfig.db,
            uid,
            getOdooCredential(),
            "sale.order",
            "read",
            [[saleId], ["name", "state", "picking_ids", "amount_total", "delivery_status", "invoice_status", "invoice_ids"]]
          );
        }
      }

      if (!Array.isArray(orders) || orders.length === 0) {
        console.log(`[Order Status] Order not found: ${orderName}`);
        return res.status(404).json({ success: false, message: "Order not found", orderName });
      }

      const order = orders[0];
      console.log(`[Order Status] Found order ${order.name}: state=${order.state}, delivery_status=${order.delivery_status}`);

      let isShipped = false;
      let isDelivered = false;
      let isApproved = ['sale', 'done'].includes(order.state);

      // 2.5 Check invoice_status (Order to Invoice/Invoiced)
      // Refined Logic:
      // - 'invoiced' or 'upselling' -> Definitely DELIVERED (Customer got it and we billed it)
      // - 'to invoice' + 'full/shipped' -> SHIPPED (It's out of warehouse, but not necessarily confirmed delivered by customer/finance)
      const isFullyShipped = order.delivery_status === 'full' || order.delivery_status === 'shipped';
      const isBilled = ['invoiced', 'upselling'].includes(order.invoice_status || '');

      if (isBilled || order.state === 'done') {
        isDelivered = true;
        isShipped = true;
        isApproved = true;
      } else if (isFullyShipped) {
        isShipped = true;
        isApproved = true;
        isDelivered = false; // Ensure it's not marked delivered yet
      }

      // 3. Check delivery_status field (if available)
      // 'full' in Odoo delivery_status usually means "Fully Shipped" (validated picking)
      const shippingValues = ['shipped', 'full', 'partial', 'started', 'in_transit', 'out_for_delivery', 'picked_up'];
      const deliveryValues = ['delivered', 'received', 'completed']; // REMOVED 'full' and 'done' from delivery values

      if (order.delivery_status) {
        if (deliveryValues.includes(order.delivery_status)) {
          isDelivered = true;
          isShipped = true;
          isApproved = true;
        } else if (shippingValues.includes(order.delivery_status) || order.delivery_status === 'done') {
          // 'done' in delivery_status often just means picking is validated (shipped)
          isShipped = true;
          isApproved = true;
        }
      }

      // 4. Get picking status for more accurate detection
      if (order.picking_ids && order.picking_ids.length > 0) {
        const pickingData = await callOdoo(
          "object",
          "execute_kw",
          odooConfig.db,
          uid,
          getOdooCredential(),
          "stock.picking",
          "search_read",
          [[["id", "in", order.picking_ids]]],
          { fields: ["id", "state", "picking_type_code", "location_dest_id"] }
        );

        if (Array.isArray(pickingData) && pickingData.length > 0) {
          // Filter for outgoing pickings (delivery orders)
          const outgoing = pickingData.filter((p) =>
            p.picking_type_code === 'outgoing' ||
            (p.location_dest_id && p.location_dest_id[1] && p.location_dest_id[1].includes('Customers'))
          );

          if (outgoing.length > 0) {
            // If any outgoing picking is 'done' (validated), it's at least SHIPPED
            if (outgoing.some((p) => p.state === 'done')) {
              isShipped = true;
              isApproved = true;
            }

            // FIX: Never assume delivered just from picking status.
            // In Odoo, a 'done' picking only means it left the warehouse (Shipped).
            // Delivered should only come from delivery_status field or manual update.
            if (outgoing.every((p) => p.state === 'done')) {
              isShipped = true;
              isApproved = true;
              // Removed: if (order.state === 'done') isDelivered = true;
            }

            // If we have pickings but they aren't 'done' yet, it's still "Approved" (Confirmed)
            if (outgoing.some((p) => ['confirmed', 'waiting', 'assigned'].includes(p.state))) {
              isApproved = true;
            }
          } else {
            // Fallback if no "outgoing" specifically found
            if (pickingData.some((p) => p.state === 'done')) {
              isShipped = true;
              isApproved = true;
            }
          }
        }
      }

      let invoiceName = "";
      if (order.invoice_ids && order.invoice_ids.length > 0) {
        try {
          const invoices = await callOdoo(
            "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
            "account.move", "read",
            [order.invoice_ids, ["name", "state"]]
          );
          if (Array.isArray(invoices)) {
            const posted = invoices.find((i) => i.state === 'posted');
            invoiceName = posted ? posted.name : invoices[0]?.name;
          }
        } catch (e) {
          console.error("[Order Status] Error fetching invoice name:", e);
        }
      }

      res.json({
        success: true,
        orderName: order.name,
        state: order.state,
        isApproved,
        isShipped,
        isDelivered,
        amount: order.amount_total,
        delivery_status: order.delivery_status,
        invoice_status: order.invoice_status,
        invoiceName
      });

    } catch (error: any) {
      console.error("[Order Status] Error:", error.message);
      res.status(500).json({ success: false, error: error.message, orderName: req.params.orderName });
    }
  });

  app.get("/api/odoo/order-portal/:orderName", async (req, res) => {
    try {
      const orderName = decodeURIComponent(req.params.orderName).trim();
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      const searchDomain: any[] = [["name", "ilike", orderName]];
      const orders = await callOdoo(
        "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
        "sale.order", "search_read",
        [searchDomain],
        { fields: ["access_url", "access_token"], limit: 1 }
      );

      if (!Array.isArray(orders) || orders.length === 0) {
        console.warn(`[Order Portal] Order not found: ${orderName}`);
        return res.status(404).json({ success: false, message: "Order not found in Odoo" });
      }

      const order = orders[0];
      if (!order.access_url) {
        console.warn(`[Order Portal] Order found but access_url is empty: ${orderName}`);
        return res.status(404).json({ success: false, message: "Portal link not generated yet for this order" });
      }

      const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
      const accessPath = order.access_url.startsWith("/") ? order.access_url : `/${order.access_url}`;
      let url = `${baseUrl}${accessPath}`;

      if (order.access_token) {
        url += (url.includes("?") ? "&" : "?") + `access_token=${order.access_token}`;
      }

      res.json({ success: true, url });
    } catch (error: any) {
      console.error("[Order Portal] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/odoo/invoice-details/:invoiceName", async (req, res) => {
    try {
      const invoiceName = decodeURIComponent(req.params.invoiceName).trim();
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      // Search 1: Exact Name Match
      let invoices = await callOdoo(
        "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
        "account.move", "search_read",
        [[["name", "=", invoiceName]]],
        { fields: ["name", "invoice_date", "amount_untaxed", "amount_tax", "amount_total", "partner_id", "invoice_line_ids"], limit: 1 }
      );

      // Search 2: Exact Origin Match (Fallback)
      if (!Array.isArray(invoices) || invoices.length === 0) {
        invoices = await callOdoo(
          "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
          "account.move", "search_read",
          [[["invoice_origin", "=", invoiceName], ["state", "=", "posted"]]],
          { fields: ["name", "invoice_date", "amount_untaxed", "amount_tax", "amount_total", "partner_id", "invoice_line_ids"], limit: 1 }
        );
      }

      // Search 3: Sale Order Match (Fallback for Quotations)
      if (!Array.isArray(invoices) || invoices.length === 0) {
        const saleOrders = await callOdoo(
          "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
          "sale.order", "search_read",
          [[["name", "=", invoiceName]]],
          { fields: ["name", "date_order", "amount_untaxed", "amount_tax", "amount_total", "partner_id", "order_line"], limit: 1 }
        );
        if (Array.isArray(saleOrders) && saleOrders.length > 0) {
          const so = saleOrders[0];
          invoices = [{
            name: so.name,
            invoice_date: so.date_order,
            amount_untaxed: so.amount_untaxed,
            amount_tax: so.amount_tax,
            amount_total: so.amount_total,
            partner_id: so.partner_id,
            invoice_line_ids: so.order_line,
            is_sale_order: true
          }];
        }
      }

      if (!Array.isArray(invoices) || invoices.length === 0) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }

      const invoice = invoices[0];

      // Fetch invoice/order lines
      if (invoice.invoice_line_ids && invoice.invoice_line_ids.length > 0) {
        const lineModel = invoice.is_sale_order ? "sale.order.line" : "account.move.line";
        const lines = await callOdoo(
          "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
          lineModel, "read",
          [invoice.invoice_line_ids, ["product_id", "name", "product_uom_qty", "quantity", "price_unit", "tax_id", "tax_ids", "price_subtotal"]]
        );
        invoice.lines = (lines as any[]).map(l => ({
          ...l,
          quantity: l.quantity || l.product_uom_qty || 0,
          tax_ids: l.tax_ids || l.tax_id || []
        })).filter((l: any) => l.product_id); // Filter out section lines
      }

      res.json({ success: true, invoice });
    } catch (error: any) {
      console.error("[Invoice Details] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Fetch Official Odoo PDF Report (Invoices & Quotations)
  app.get("/api/odoo/invoice-pdf/:docName", async (req, res) => {
    try {
      const docName = decodeURIComponent(req.params.docName).trim();
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      const isQuotation = docName.startsWith('S') || docName.includes('SO');
      const model = isQuotation ? "sale.order" : "account.move";
      const reportNames = isQuotation 
        ? ["sale.report_saleorder", "sale.report_saleorder_pro_forma"] 
        : ["account.report_invoice_with_payments", "account.report_invoice"];

      // 1. Find the document ID
      const docs = await callOdoo(
        "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
        model, "search",
        [[["name", "=", docName]]],
        { limit: 1 }
      );

      let foundDocId = Array.isArray(docs) && docs.length > 0 ? docs[0] : null;

      // Fallback for invoices: search by origin (Sale Order name)
      if (!foundDocId && !isQuotation) {
        const fallback = await callOdoo(
          "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
          "account.move", "search",
          [[["invoice_origin", "=", docName], ["state", "=", "posted"]]],
          { limit: 1 }
        );
        if (Array.isArray(fallback) && fallback.length > 0) {
           foundDocId = fallback[0];
        }
      }

      if (!foundDocId) return res.status(404).json({ success: false, message: "Document not found" });

      // 2. Odoo 18 Session-Based PDF Fetching
      let pdfBuffer: Buffer | null = null;
      let lastError = "";

      try {
        const axios = require('axios');
        const authResponse = await axios.post(`${odooConfig.url}/web/session/authenticate`, {
          jsonrpc: "2.0",
          params: { db: odooConfig.db, login: odooConfig.username, password: odooConfig.password }
        });

        const sessionCookie = authResponse.headers['set-cookie'];
        if (!sessionCookie) throw new Error("Failed to get session cookie from Odoo");

        for (const reportName of reportNames) {
          try {
            const pdfUrl = `${odooConfig.url}/report/pdf/${reportName}/${foundDocId}`;
            const pdfResponse = await axios.get(pdfUrl, {
              headers: { 'Cookie': sessionCookie.join('; ') },
              responseType: 'arraybuffer'
            });

            if (pdfResponse.status === 200 && pdfResponse.data.length > 1000) {
              pdfBuffer = Buffer.from(pdfResponse.data);
              break;
            }
          } catch (e: any) { lastError = e.message; }
        }
      } catch (e: any) {
        lastError = e.message;
      }

      if (pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${docName}.pdf"`);
        res.send(pdfBuffer);
      } else {
        res.status(500).json({ success: false, message: `Odoo PDF Fetch Failed. ${lastError}` });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/odoo/invoice-portal/:invoiceName", async (req, res) => {
    try {
      const invoiceName = decodeURIComponent(req.params.invoiceName).trim();
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      let invoices = await callOdoo(
        "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
        "account.move", "search_read",
        [[["name", "ilike", invoiceName]]],
        { fields: ["access_url", "access_token"], limit: 1 }
      );

      // Fallback: search by invoice_origin (Sale Order name) if not found by direct name
      if (!Array.isArray(invoices) || invoices.length === 0) {
        console.log(`[Invoice Portal] Not found by name, trying fallback by origin: ${invoiceName}`);
        invoices = await callOdoo(
          "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
          "account.move", "search_read",
          [[["invoice_origin", "ilike", invoiceName], ["state", "=", "posted"]]],
          { fields: ["access_url", "access_token"], limit: 1 }
        );
      }

      if (!Array.isArray(invoices) || invoices.length === 0) {
        console.warn(`[Invoice Portal] Invoice not found with name/origin: ${invoiceName}`);
        return res.status(404).json({ success: false, message: "Invoice not found in Odoo" });
      }

      const invoice = invoices[0];
      if (!invoice.access_url) {
        console.warn(`[Invoice Portal] Invoice found but access_url is empty: ${invoiceName}`);
        return res.status(404).json({ success: false, message: "Portal link not generated yet for this invoice" });
      }

      const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
      const accessPath = invoice.access_url.startsWith("/") ? invoice.access_url : `/${invoice.access_url}`;
      let url = `${baseUrl}${accessPath}`;

      if (invoice.access_token) {
        url += (url.includes("?") ? "&" : "?") + `access_token=${invoice.access_token}`;
      }

      res.json({ success: true, url });
    } catch (error: any) {
      console.error("[Invoice Portal] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Order History / Tracking
  app.get("/api/odoo/order-history/:orderName", async (req, res) => {
    try {
      const orderName = decodeURIComponent(req.params.orderName);
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      // 1. Find the order ID
      console.log(`[Order History] START search for orderName: "${orderName}"`);

      let searchDomain: any = [["|", ["name", "ilike", orderName.trim()], ["client_order_ref", "ilike", orderName.trim()]]];

      // If orderName is purely numeric, also search by ID
      if (/^\d+$/.test(orderName.trim())) {
        searchDomain = [["|", "|", ["name", "ilike", orderName.trim()], ["client_order_ref", "ilike", orderName.trim()], ["id", "=", parseInt(orderName.trim())]]];
      }

      let orders = await callOdoo(
        "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
        "sale.order", "search_read",
        searchDomain,
        { fields: ["id", "create_date", "picking_ids", "name", "state"] }
      );

      console.log(`[Order History] Sale order search results: ${Array.isArray(orders) ? orders.length : 0}`);

      // Fallback: If not found by name, try to find by origin or picking name
      if (!Array.isArray(orders) || orders.length === 0) {
        console.log(`[Order History] Order "${orderName}" not found in sale.order, searching in stock.picking...`);
        const pickingSearch = await callOdoo(
          "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
          "stock.picking", "search_read",
          [["|", ["name", "ilike", orderName.trim()], ["origin", "ilike", orderName.trim()]]],
          { fields: ["sale_id", "name", "origin", "create_date", "state"], limit: 1 }
        );

        if (Array.isArray(pickingSearch) && pickingSearch.length > 0) {
          console.log(`[Order History] Found picking fallback: ${pickingSearch[0].name} (Origin: ${pickingSearch[0].origin})`);
          if (pickingSearch[0].sale_id) {
            const saleId = pickingSearch[0].sale_id[0];
            orders = await callOdoo(
              "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
              "sale.order", "read", [[saleId], ["id", "create_date", "picking_ids", "name", "state"]]
            );
          } else {
            orders = [{
              id: null,
              create_date: pickingSearch[0].create_date,
              picking_ids: [pickingSearch[0].id],
              name: pickingSearch[0].name,
              state: pickingSearch[0].state
            }];
          }
        }
      }

      if (!Array.isArray(orders) || orders.length === 0) {
        console.error(`[Order History] No order or picking found for: ${orderName}`);
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const order = orders[0];
      console.log(`[Order History] Processing order/picking: ${order.name} (ID: ${order.id || 'N/A'}, State: ${order.state})`);
      const history: any[] = [];
      const processedMessageIds = new Set();

      // 2. Add Creation event (if we have a date)
      if (order.create_date) {
        history.push({
          type: 'created',
          title: order.id ? 'Order Created' : 'Delivery Created',
          title_ar: order.id ? 'تم إنشاء الطلب' : 'تم إنشاء مستند التسليم',
          date: order.create_date,
          status: 'completed'
        });
      }

      // 3. Find related objects (Pickings and Invoices)
      const pickingIds = order.picking_ids || [];
      const invoiceSearch = order.id ? await callOdoo(
        "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
        "account.move", "search_read", [[["invoice_origin", "=", order.name]]],
        { fields: ["id", "name", "state", "payment_state", "create_date"] }
      ) : [];

      // 4. Fetch Messages from Order, Pickings, and Invoices
      const messageSubDomains: any[] = [];
      if (order.id) messageSubDomains.push(["&", ["res_id", "=", order.id], ["model", "=", "sale.order"]]);
      if (Array.isArray(pickingIds) && pickingIds.length > 0) messageSubDomains.push(["&", ["res_id", "in", pickingIds.slice(0, 5)], ["model", "=", "stock.picking"]]); // Limit pickings
      if (Array.isArray(invoiceSearch) && invoiceSearch.length > 0) messageSubDomains.push(["&", ["res_id", "in", invoiceSearch.slice(0, 5).map((i) => i.id)], ["model", "=", "account.move"]]); // Limit invoices

      if (messageSubDomains.length > 0) {
        const messageDomain: any[] = [];
        for (let i = 0; i < messageSubDomains.length - 1; i++) messageDomain.push("|");
        messageDomain.push(...messageSubDomains.flat());

        try {
          const messages = await callOdoo(
            "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
            "mail.message", "search_read",
            [messageDomain],
            { fields: ["id", "body", "date", "message_type", "subtype_id", "tracking_value_ids", "model"], order: "date desc", limit: 20 } // Added limit 20
          );

          console.log(`[Order History] Found ${Array.isArray(messages) ? messages.length : 0} messages`);

          if (Array.isArray(messages)) {
            for (const msg of messages) {
              if (processedMessageIds.has(msg.id)) continue;
              processedMessageIds.add(msg.id);

              const cleanBody = (msg.body || "").replace(/<[^>]*>?/gm, '').trim();

              // Detailed logging for debugging
              if ((msg.tracking_value_ids && msg.tracking_value_ids.length > 0) || cleanBody.length > 0) {
                console.log(`[Order History] Msg ${msg.id} (${msg.model}): type=${msg.message_type}, subtype=${msg.subtype_id?.[1] || 'none'}, tracking=${msg.tracking_value_ids?.length || 0}`);
              }

              // Handle tracking values (Formal state changes)
              if (msg.tracking_value_ids && Array.isArray(msg.tracking_value_ids) && msg.tracking_value_ids.length > 0) {
                try {
                  const tracking = await callOdoo(
                    "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
                    "mail.tracking.value", "read", [msg.tracking_value_ids],
                    { fields: ["field_desc", "old_value_char", "new_value_char"] }
                  );

                  if (Array.isArray(tracking)) {
                    for (const t of tracking) {
                      const fieldDesc = (t.field_desc || "").toLowerCase();
                      // Check for status/state changes in Arabic or English
                      if (fieldDesc.includes("status") || fieldDesc.includes("state") || fieldDesc.includes("حالة") || fieldDesc.includes("مرحلة")) {
                        let title = `Status changed to ${t.new_value_char}`;
                        let title_ar = `تغيرت الحالة إلى ${t.new_value_char}`;

                        const newVal = (t.new_value_char || "").toLowerCase();
                        if (newVal.includes('sales order') || newVal.includes('locked') || newVal.includes('تم التصديق')) {
                          title = 'Order Approved';
                          title_ar = 'تمت الموافقة على الطلب';
                        } else if (newVal === 'done' || newVal.includes('completed') || newVal.includes('تم الانتهاء')) {
                          title = 'Order Completed';
                          title_ar = 'تم اكتمال الطلب';
                        } else if (newVal === 'cancel' || newVal.includes('ملغي')) {
                          title = 'Order Cancelled';
                          title_ar = 'تم إلغاء الطلب';
                        }

                        history.push({
                          type: 'status_change',
                          title,
                          title_ar,
                          date: msg.date,
                          status: 'completed'
                        });
                      }
                    }
                  }
                } catch (e) {
                  console.error(`[Order History] Error reading tracking values for msg ${msg.id}:`, e);
                }
              }
              // Handle notification messages without tracking values (Informal updates)
              else if (cleanBody && (msg.message_type === 'notification' || msg.message_type === 'comment')) {
                const lowerBody = cleanBody.toLowerCase();

                // Skip common Odoo noise
                if (lowerBody.includes("notification sent") || lowerBody.includes("mail sent") || lowerBody.includes("digest")) continue;

                let detectedEvent = null;

                if (lowerBody.includes('confirm') || lowerBody.includes('تأكيد')) {
                  detectedEvent = { en: 'Order Confirmed', ar: 'تم تأكيد الطلب' };
                } else if (lowerBody.includes('paid') || lowerBody.includes('payment') || lowerBody.includes('دفع')) {
                  detectedEvent = { en: 'Payment Received', ar: 'تم استلام الدفع' };
                } else if (lowerBody.includes('shipped') || lowerBody.includes('شحن')) {
                  detectedEvent = { en: 'Order Shipped', ar: 'تم شحن الطلب' };
                } else if (lowerBody.includes('delivered') || lowerBody.includes('توصيل')) {
                  detectedEvent = { en: 'Order Delivered', ar: 'تم توصيل الطلب' };
                } else if (lowerBody.includes('validate') || lowerBody.includes('تصديق')) {
                  detectedEvent = { en: 'Order Validated', ar: 'تم التصديق على الطلب' };
                }

                if (detectedEvent) {
                  history.push({
                    type: 'status_change',
                    title: detectedEvent.en,
                    title_ar: detectedEvent.ar,
                    date: msg.date,
                    status: 'completed'
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error(`[Order History] Error fetching messages:`, e);
        }
      }

      // 5. Add events from associated objects if not captured by messages

      // Pickings (Shipments)
      if (pickingIds.length > 0) {
        try {
          const pickings = await callOdoo(
            "object", "execute_kw", odooConfig.db, uid, getOdooCredential(),
            "stock.picking", "read", [pickingIds],
            { fields: ["name", "state", "date_done", "create_date"] }
          );

          if (Array.isArray(pickings)) {
            for (const p of pickings) {
              if (p.state === 'done' && p.date_done) {
                history.push({
                  type: 'shipped',
                  title: `Delivery Completed (${p.name})`,
                  title_ar: `اكتمل التسليم (${p.name})`,
                  date: p.date_done,
                  status: 'completed'
                });
              } else if (['assigned', 'confirmed'].includes(p.state)) {
                history.push({
                  type: 'preparing',
                  title: `Preparing Order (${p.name})`,
                  title_ar: `جاري تجهيز الطلب (${p.name})`,
                  date: p.create_date,
                  status: 'in_progress'
                });
              }
            }
          }
        } catch (e) {
          console.error("[Order History] Error reading pickings:", e);
        }
      }

      // Invoices
      if (Array.isArray(invoiceSearch)) {
        for (const inv of invoiceSearch) {
          if (inv.payment_state === 'paid') {
            history.push({
              type: 'status_change',
              title: `Invoice Paid (${inv.name})`,
              title_ar: `تم دفع الفاتورة (${inv.name})`,
              date: inv.create_date,
              status: 'completed'
            });
          } else if (inv.state === 'posted') {
            history.push({
              type: 'status_change',
              title: `Invoice Generated (${inv.name})`,
              title_ar: `تم إصدار الفاتورة (${inv.name})`,
              date: inv.create_date,
              status: 'completed'
            });
          }
        }
      }

      // 6. Sort and finalize history
      const validHistory = history
        .filter(item => item.date && !isNaN(new Date(item.date).getTime()))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fallback: If no history collected but order exists, add a current state event
      if (validHistory.length === 0) {
        console.log(`[Order History] History still empty for ${order.name}, using current state: ${order.state}`);
        let stateTitle = `Order Status: ${order.state}`;
        let stateTitleAr = `حالة الطلب: ${order.state}`;

        if (order.state === 'draft') {
          stateTitle = 'Order Drafted';
          stateTitleAr = 'الطلب في مرحلة المسودة';
        } else if (order.state === 'sent') {
          stateTitle = 'Quotation Sent';
          stateTitleAr = 'تم إرسال عرض السعر';
        } else if (order.state === 'sale') {
          stateTitle = 'Order Confirmed';
          stateTitleAr = 'تم تأكيد الطلب';
        } else if (order.state === 'done') {
          stateTitle = 'Order Completed';
          stateTitleAr = 'تم اكتمال الطلب';
        } else if (order.state === 'cancel') {
          stateTitle = 'Order Cancelled';
          stateTitleAr = 'تم إلغاء الطلب';
        }

        validHistory.push({
          type: 'status_change',
          title: stateTitle,
          title_ar: stateTitleAr,
          date: order.create_date || new Date().toISOString(),
          status: 'completed'
        });
      }

      console.log(`[Order History] Final history count for ${order.name}: ${Array.isArray(validHistory) ? validHistory.length : 0}`);
      res.json({
        success: true,
        history: validHistory,
        debug: {
          orderFound: !!order,
          orderName: order.name,
          orderId: order.id,
          messagesCount: processedMessageIds.size,
          pickingsCount: Array.isArray(pickingIds) ? pickingIds.length : 0,
          invoicesCount: Array.isArray(invoiceSearch) ? invoiceSearch.length : 0,
          fallbackUsed: validHistory.length === 1 && validHistory[0].type === 'status_change' && validHistory[0].title.includes('Order Status')
        }
      });

    } catch (error: any) {
      console.error("[Order History] Error:", error.message);
      res.status(500).json({ success: false, error: error.message, orderName: req.params.orderName });
    }
  });

  // Odoo Orders
  app.get("/api/odoo/orders", async (req, res) => {
    try {
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });
      const orders = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "sale.order", "search_read", [[]], { fields: ["name", "partner_id", "amount_total", "state", "date_order"], limit: 50, order: "id desc" });
      res.json({ success: true, data: Array.isArray(orders) ? orders : [] });
    } catch (error: any) {
      console.error("Orders Fetch Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Lookup Order by email and total
  app.post("/api/odoo/lookup-order", async (req, res) => {
    const { email, total, createdAt } = req.body;
    try {
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      console.log(`[Order Lookup] Searching for order: Email=${email}, Total=${total}`);

      // 1. Find the partner first
      const partners = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search_read", [[["email", "=", email]]], { fields: ["id"], limit: 1 });
      if (!Array.isArray(partners) || partners.length === 0) return res.status(404).json({ success: false, message: "Customer not found in Odoo" });

      const partnerId = partners[0].id;

      // 2. Search for orders for this partner with similar total
      // We allow a small margin for the total due to rounding
      const minTotal = total - 0.1;
      const maxTotal = total + 0.1;

      const orders = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "sale.order", "search_read",
        [[["partner_id", "=", partnerId], ["amount_total", ">=", minTotal], ["amount_total", "<=", maxTotal]]],
        { fields: ["id", "name", "state", "create_date"], limit: 5, order: "id desc" }
      );

      if (Array.isArray(orders) && orders.length > 0) {
        console.log(`[Order Lookup] Found ${orders.length} potential matches. Using newest: ${orders[0].name}`);
        return res.json({ success: true, data: orders[0] });
      }

      // 3. Fallback: Search by date if provided
      if (createdAt) {
        const dateStr = new Date(createdAt).toISOString().split('T')[0];
        const dateOrders = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "sale.order", "search_read",
          [[["partner_id", "=", partnerId], ["create_date", ">=", dateStr]]],
          { fields: ["id", "name", "state", "create_date"], limit: 5, order: "id desc" }
        );
        if (Array.isArray(dateOrders) && dateOrders.length > 0) {
          console.log(`[Order Lookup] Found match by date: ${dateOrders[0].name}`);
          return res.json({ success: true, data: dateOrders[0] });
        }
      }

      res.status(404).json({ success: false, message: "No matching order found in Odoo" });
    } catch (error: any) {
      console.error("[Order Lookup] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Order Creation
  app.post("/api/odoo/orders", async (req, res) => {
    try {
      // Explicitly set timeout for the entire request handling (Render default is 30s)
      req.setTimeout(60000);

      const { customerEmail, items, customerName, phone, salespersonId, salesRepName } = req.body;
      const uid = await authenticateOdoo();
      if (!uid) return res.status(401).json({ success: false, message: "Odoo Auth Failed" });

      // 1. Find Partner (Flexible Search)
      const cleanPhone = phone ? String(phone).replace(/[^\d]/g, '') : "";
      const last9 = cleanPhone.slice(-9);

      console.log(`[Odoo Order] Searching for customer: ${customerEmail} | Phone: ${cleanPhone}`);

      let partnerId = null;

      // Attempt 1: Exact Email
      if (customerEmail) {
        const pEmail = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search",
          [[["email", "=", customerEmail]]], { limit: 1 });
        if (Array.isArray(pEmail) && pEmail.length > 0) partnerId = pEmail[0];
      }

      // Attempt 2: Flexible Phone
      if (!partnerId && last9) {
        const pPhone = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search",
          [["|", ["mobile", "ilike", last9], ["phone", "ilike", last9]]], { limit: 1 });
        if (Array.isArray(pPhone) && pPhone.length > 0) partnerId = pPhone[0];
      }

      // Attempt 3: Create Customer if still not found
      if (!partnerId) {
        console.log("[Odoo Order] Customer not found. Creating new partner...");
        const newPartnerData: any = {
          name: customerName || (customerEmail ? customerEmail.split('@')[0] : `Web Customer ${cleanPhone}`),
          email: customerEmail || false,
          mobile: phone || false,
          street: (req.body.address || "").slice(0, 120),
          comment: "Created automatically from Web Store order"
        };

        try {
          partnerId = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "create", [newPartnerData]);
          console.log("[Odoo Order] Created new partner ID:", partnerId);
        } catch (e) {
          console.error("[Odoo Order] Failed to create partner:", e.message);
          // Last fallback: use a generic 'Web Sales' partner if ID 1 or similar exists, 
          // but for now we'll throw to catch critical issues
          throw new Error("Could not find or create customer in Odoo");
        }
      }

      // 2. Create Order
      const orderData: any = {
        partner_id: partnerId,
        state: 'draft'
      };

      // Try to assign salesperson by ID first, then by name if ID is not available
      if (salespersonId) {
        orderData.user_id = salespersonId;
        console.log("[Odoo Order] Assigning salesperson ID:", salespersonId);
      } else if (salesRepName) {
        // Try to find the salesperson by name in Odoo
        try {
          const salespersons = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.users", "search_read", [[["name", "ilike", salesRepName]]], { fields: ["id", "name"], limit: 1 });
          if (Array.isArray(salespersons) && salespersons.length > 0) {
            orderData.user_id = salespersons[0].id;
            console.log("[Odoo Order] Found salesperson by name:", salesRepName, "-> ID:", salespersons[0].id);
          } else {
            console.log("[Odoo Order] Salesperson not found by name:", salesRepName);
          }
        } catch (e) {
          console.error("[Odoo Order] Error searching for salesperson by name:", e);
        }
      }

      // 2. Prepare Order lines data - Batch search for products
      const orderLines = [];
      if (Array.isArray(items) && items.length > 0) {
        const productNames = items.map(item => item.name || item.productName).filter(Boolean);
        console.log(`[Odoo Order] Searching for ${productNames.length} products...`);

        // Batch search for all products at once
        const foundProducts: any = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "product.product", "search_read",
          [[["name", "in", productNames]]],
          { fields: ["id", "name"], limit: 100 }
        );

        const productMap = new Map();
        if (Array.isArray(foundProducts)) {
          foundProducts.forEach(p => productMap.set(p.name.toLowerCase(), p.id));
        }

        for (const item of items) {
          const name = (item.name || item.productName || "").toLowerCase();
          let productId = productMap.get(name);

          // Fallback: search by ilike if not found exactly
          if (!productId && name) {
            try {
              const fallback = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "product.product", "search", [[["name", "ilike", name]]], { limit: 1 });
              if (Array.isArray(fallback) && fallback.length > 0) {
                productId = fallback[0];
              }
            } catch (e) {
              console.error(`[Odoo Order] Fallback product search failed for ${name}:`, e.message);
            }
          }

          if (productId) {
            const price = parseFloat(String(item.discountPrice || item.price || "0").replace(/[^\d.]/g, '')) || 0;
            orderLines.push([0, 0, {
              product_id: productId,
              product_uom_qty: item.quantity || 1,
              price_unit: price,
              name: item.name || item.productName
            }]);
          }
        }
      }

      // 3. Create Order with lines in one call (more efficient)
      const orderDataWithLines = {
        ...orderData,
        order_line: orderLines
      };

      console.log("[Odoo Order] Creating order for:", customerName);
      const orderId = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "sale.order", "create", [orderDataWithLines]);

      if (!orderId) throw new Error("Failed to create order in Odoo");

      // 4. (MODIFIED) Do NOT auto-confirm or auto-invoice. 
      // Leave the order as a Quotation (Draft) for manual review.
      let invoiceName = "";
      let orderNameResult = `SO-${orderId}`;

      try {
        // Get the real Odoo Order Name (like S00123)
        const orderInfo = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "sale.order", "read", [[orderId], ["name"]]);
        if (Array.isArray(orderInfo) && orderInfo.length > 0) {
          orderNameResult = orderInfo[0].name;
        }

        console.log("[Odoo Order] Order created successfully as Draft:", orderNameResult);
      } catch (e) {
        console.error("[Odoo Order] Error fetching order name:", e.message);
      }

      res.json({
        success: true,
        orderId,
        orderName: orderNameResult,
        invoiceName: invoiceName || undefined
      });

    } catch (error: any) {
      console.error("Order Creation Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // OTP Management - Local in-memory store (Firebase-free)
  const otpStore = new Map<string, { code: string, expires: number, odooName?: string, odooId?: number, odooData?: any }>();

  app.get("/api/check-phone", async (req, res) => {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Phone number required" });
    }

    try {
      const cleanPhone = sanitizePhone(phone);
      const user = authDb.findUserByPhone(cleanPhone);
      res.json({ exists: !!user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/send-otp", async (req, res) => {
    const { phone, reason } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "رقم الجوال مطلوب" });

    try {
      const cleanPhone = sanitizePhone(phone);

      // Check local auth db for register/reset validation
      if (reason === 'register' || reason === 'reset') {
        const existingUser = authDb.findUserByPhone(cleanPhone);
        if (reason === 'register' && existingUser) {
          return res.status(400).json({
            success: false,
            error: "هذا الرقم مسجل مسبقاً لدينا. يمكنك تسجيل الدخول مباشرة، أو استعادة كلمة المرور إذا كنت قد نسيتها."
          });
        }
        if (reason === 'reset' && !existingUser) {
          return res.status(404).json({
            success: false,
            error: "عذراً، هذا الرقم غير مسجل في النظام كحساب مستخدم. يرجى إنشاء حساب جديد أولاً."
          });
        }
      }

      // Check for existing valid OTP in memory
      const existingOtp = otpStore.get(cleanPhone);
      if (existingOtp && existingOtp.expires > Date.now()) {
        console.log(`[OTP] Resending existing valid OTP for ${cleanPhone}`);
        const message = `كود التحقق الخاص بك لمتجر شركة حقال للتجارة هو: ${existingOtp.code}`;
        console.log(`[OTP RESEND] Phone: ${cleanPhone} | CODE: ${existingOtp.code}`);
        const result = await sendMadarSMS(cleanPhone, message);
        if (result.success) return res.json({ success: true, message: "Code resent" });
        return res.status(500).json({ success: false, error: result.error, debug: result.debug });
      }

      // Verify phone in Odoo
      console.log(`[OTP] Verifying phone in Odoo: ${cleanPhone}`);
      const uid = await authenticateOdoo();
      const last9 = cleanPhone.slice(-9);
      const last7 = cleanPhone.slice(-7);
      const fuzzyPattern = `%${last9.split("").join("%")}%`;
      const partialPattern = `%${last7.substring(0, 3)}%${last7.substring(3)}%`;

      const odooCustomers = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "res.partner", "search_read",
        [[
          "|", "|", "|", "|", "|", "|", "|", "|", "|", "|", "|", "|",
          ["mobile", "ilike", cleanPhone],
          ["phone", "ilike", cleanPhone],
          ["mobile", "ilike", last9],
          ["phone", "ilike", last9],
          ["mobile", "ilike", last7],
          ["phone", "ilike", last7],
          ["mobile", "ilike", fuzzyPattern],
          ["phone", "ilike", fuzzyPattern],
          ["mobile", "ilike", partialPattern],
          ["phone", "ilike", partialPattern],
          ["mobile", "ilike", `%${last7}%`],
          ["phone", "ilike", `%${last7}%`],
          ["email", "ilike", `${cleanPhone}@`]
        ]],
        { fields: ["id", "name", "phone", "mobile"], limit: 1 }
      );

      if (!Array.isArray(odooCustomers) || odooCustomers.length === 0) {
        return res.status(404).json({
          success: false,
          error: "هذا الرقم غير مسجل من ضمن عملاء شركة حقال للتجارة"
        });
      }

      console.log(`[OTP] Found customer in Odoo: ${odooCustomers[0].name}`);

      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store in memory
      otpStore.set(cleanPhone, {
        code,
        expires,
        odooName: odooCustomers[0].name,
        odooId: odooCustomers[0].id,
        odooData: odooCustomers[0],
      });

      const message = `كود التحقق الخاص بك لمتجر شركة حقال للتجارة هو: ${code}`;
      console.log(`*************************************************`);
      console.log(`[OTP SEND] TARGET: ${cleanPhone} | CODE: ${code}`);
      console.log(`*************************************************`);
      const result = await sendMadarSMS(cleanPhone, message);

      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ success: false, error: result.error || "فشل إرسال الرسالة القصيرة", debug: result.debug });
      }
    } catch (error: any) {
      console.error("[OTP Error]", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/verify-otp", async (req, res) => {
    const { phone, otp, password, email: reqEmail, name: reqName } = req.body;
    const cleanPhone = sanitizePhone(phone);

    // Get OTP from in-memory store
    const stored = otpStore.get(cleanPhone);

    console.log(`[OTP Verify] Attempt for ${cleanPhone}. Provided: ${otp}, Stored: ${stored?.code}`);

    if (!stored) {
      return res.status(400).json({ success: false, error: "الكود غير موجود، يرجى إعادة إرسال الرمز" });
    }
    if (stored.expires < Date.now()) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: "الكود منتهي الصلاحية، يرجى إعادة إرسال الرمز" });
    }
    if (stored.code !== otp) {
      return res.status(400).json({ success: false, error: "رمز التحقق غير صحيح" });
    }

    // OTP valid — determine uid for backward-compat response
    const { odooId, odooData, odooName } = stored;
    const email = reqEmail || (odooData?.email) || `${cleanPhone}@hakkal.com`;
    const displayName = reqName || odooName || odooData?.name || "Customer";
    const uid = cleanPhone; // local uid = phone

    // Create or update user in local auth db if password provided (register flow)
    try {
      let userRecord = null;
      if (password) {
        const existingUser = authDb.findUserByPhone(cleanPhone);
        if (!existingUser) {
          userRecord = authDb.createUser({ phone: cleanPhone, email, password, name: displayName, odooPartnerId: odooId });
        } else {
          authDb.updatePassword(uid, password);
          userRecord = authDb.findUserByUid(uid);
        }
      } else {
        userRecord = authDb.findUserByPhone(cleanPhone);
      }

      // Clean OTP
      otpStore.delete(cleanPhone);

      // Generate JWT token for direct login after OTP
      const token = signToken({ uid, phone: cleanPhone, email, name: displayName, isAdmin: userRecord?.isAdmin || false, role: userRecord?.role || 'customer' });

      res.json({ 
        success: true, 
        uid, 
        token, 
        customToken: token,
        user: userRecord ? {
          uid: userRecord.uid,
          phone: userRecord.phone,
          email: userRecord.email,
          name: userRecord.name,
          isAdmin: userRecord.isAdmin,
          role: userRecord.role,
          accountActivated: userRecord.accountActivated,
          odooPartnerId: userRecord.odooPartnerId,
        } : undefined
      });
    } catch (error: any) {
      console.error("[Verify OTP Error]", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── NEW JWT AUTH ROUTES (Firebase-free) ───────────────────────

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ success: false, error: "Phone and password required" });

    try {
      console.log(`[Auth Login Attempt] Input: ${phone}, isEmail: ${phone.includes("@")}`);

      let user = null;
      if (phone.includes("@")) {
        user = authDb.findUserByEmail(phone);
      } else {
        const cleanPhone = sanitizePhone(phone);
        user = authDb.findUserByPhone(cleanPhone);
        console.log(`[Auth Login Attempt] Cleaned phone: ${cleanPhone}`);
      }

      if (!user) {
        console.log(`[Auth Login] User not found: ${phone}`);
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      const passMatch = await authDb.verifyPassword(user, password);
      console.log(`[Auth Login] User found: ${user.uid}, Password match: ${passMatch}`);

      if (!passMatch) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      if (!user.accountActivated && !user.isAdmin) {
        return res.status(403).json({ success: false, error: "Account pending activation", pendingActivation: true });
      }

      const token = signToken({
        uid: user.uid,
        phone: user.phone,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        role: user.role,
      });

      console.log(`[Auth Login] Success: ${user.uid}`);
      res.json({
        success: true,
        token,
        user: {
          uid: user.uid,
          phone: user.phone,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          role: user.role,
          accountActivated: user.accountActivated,
          odooPartnerId: user.odooPartnerId,
        }
      });
    } catch (error: any) {
      console.error("[Auth Login Error]", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/auth/register  (called after OTP verified)
  app.post("/api/auth/register", async (req, res) => {
    const { phone, password, name, email: customEmail } = req.body;
    if (!phone || !password || !name) {
      return res.status(400).json({ success: false, error: "Phone, password, and name are required" });
    }

    try {
      const cleanPhone = sanitizePhone(phone);
      const email = customEmail || `${cleanPhone}@hakkal.com`;

      // Check if already registered
      const existing = authDb.findUserByPhone(cleanPhone);
      if (existing) {
        return res.status(409).json({ success: false, error: "Phone number already registered" });
      }

      // Look up Odoo to find partner
      let odooPartnerId: number | undefined;
      try {
        const odooUid = await authenticateOdoo();
        if (odooUid) {
          const partners = await callOdoo("object", "execute_kw",
            odooConfig.db, odooUid, getOdooCredential(),
            "res.partner", "search_read",
            [["|", ["mobile", "ilike", cleanPhone.slice(-9)], ["phone", "ilike", cleanPhone.slice(-9)]]],
            { fields: ["id"], limit: 1 }
          );
          if (Array.isArray(partners) && partners.length > 0) {
            odooPartnerId = partners[0].id;
            console.log(`[Auth Register] Found Odoo partner: ${odooPartnerId}`);
          }
        }
      } catch (e: any) {
        console.warn("[Auth Register] Could not lookup Odoo partner:", e.message);
      }

      const user = authDb.createUser({ phone: cleanPhone, email, password, name, odooPartnerId });

      const token = signToken({
        uid: user.uid,
        phone: user.phone,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        role: user.role,
      });

      console.log(`[Auth Register] Created user: ${user.uid}`);
      res.json({
        success: true,
        token,
        uid: user.uid,
        user: {
          uid: user.uid,
          phone: user.phone,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          role: user.role,
          accountActivated: user.accountActivated,
        }
      });
    } catch (error: any) {
      console.error("[Auth Register Error]", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/auth/me  - Verify token & return user info
  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const user = authDb.findUserByUid(req.user.uid);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({
      success: true,
      user: {
        uid: user.uid,
        phone: user.phone,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        role: user.role,
        accountActivated: user.accountActivated,
        odooPartnerId: user.odooPartnerId,
      }
    });
  });

  // POST /api/auth/change-password
  app.post("/api/auth/change-password", requireAuth, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = authDb.findUserByUid(req.user.uid);
    if (!user || !authDb.verifyPassword(user, currentPassword)) {
      return res.status(401).json({ success: false, error: "Current password is incorrect" });
    }
    authDb.updatePassword(user.uid, newPassword);
    res.json({ success: true, message: "Password updated successfully" });
  });

  // POST /api/set-password  (called after OTP reset - no auth required)
  app.post("/api/set-password", async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ success: false, error: "Phone and password required" });

    try {
      const cleanPhone = sanitizePhone(phone);
      const user = authDb.findUserByPhone(cleanPhone);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });

      authDb.updatePassword(user.uid, password);

      const token = signToken({
        uid: user.uid,
        phone: user.phone,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        role: user.role,
      });

      res.json({ 
        success: true, 
        token, 
        uid: user.uid,
        user: {
          uid: user.uid,
          phone: user.phone,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          role: user.role,
          accountActivated: user.accountActivated,
          odooPartnerId: user.odooPartnerId,
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/auth/users (admin only)
  app.get("/api/auth/users", requireAdmin, (req: any, res) => {
    const users = authDb.getAllUsers().map(u => ({
      uid: u.uid,
      phone: u.phone,
      email: u.email,
      name: u.name,
      role: u.role,
      isAdmin: u.isAdmin,
      accountActivated: u.accountActivated,
      odooPartnerId: u.odooPartnerId,
      createdAt: u.createdAt,
    }));
    res.json({ success: true, data: users });
  });

  // POST /api/auth/activate (admin only)
  app.post("/api/auth/activate", requireAdmin, (req: any, res) => {
    const { uid } = req.body;
    const ok = authDb.activateUser(uid);
    if (!ok) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, message: "User activated" });
  });

  // DELETE /api/auth/user (admin or self)
  app.delete("/api/auth/user/:uid", requireAuth, (req: any, res) => {
    const targetUid = req.params.uid;
    if (!req.user.isAdmin && req.user.uid !== targetUid) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const ok = authDb.deleteUser(targetUid);
    if (!ok) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, message: "User deleted" });
  });

  // GET /api/get-email-by-phone (legacy compat - now from local db)
  app.get("/api/get-email-by-phone", (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Phone is required" });
    const cleanPhone = sanitizePhone(phone as string);
    const user = authDb.findUserByPhone(cleanPhone);
    if (user) return res.json({ success: true, email: user.email });
    // Fallback
    return res.json({ success: true, email: `${cleanPhone}@hakkal.com` });
  });

  // Email Notification
  app.post("/api/send-email", async (req, res) => {
    const { customerEmail, customerName, items, total, orderId } = req.body;
    if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Resend key missing" });
    try {
      const resend = new Resend(process.env.RESEND_API_KEY.trim());
      const { data, error } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: [customerEmail],
        subject: `Order Confirmation #${orderId}`,
        html: `<p>Hi ${customerName}, your order has been received. Total: ⃁ ${total}</p>`
      });
      res.json({ success: !error, data, error });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Serve static files from the 'dist' directory in production
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log(`[Static] Serving files from: ${distPath}`);
  console.log(`[Static] Current Directory (cwd): ${process.cwd()}`);

  app.use(express.static(distPath));

  // Catch-all for API routes to prevent HTML responses
  app.all('/api/*', (req, res) => {
    console.log(`[API 404] Method: ${req.method}, Path: ${req.path}`);
    res.status(404).json({ success: false, error: "API endpoint not found" });
  });

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Static Error] Failed to serve index.html from ${indexPath}:`, err);
          res.status(500).send("Build files not found. Please run 'npm run build' and restart the server.");
        }
      });
    }
  });

  // Handle Server Start (Local, Render, etc. - except Vercel)
  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  module.exports = app;
