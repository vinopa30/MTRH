import express from "express";
import http from "http";
import path from "path";
import * as cheerio from 'cheerio';
import fs from "fs";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === "production" || !!process.env.K_SERVICE || (typeof __filename !== "undefined" && __filename.includes("dist"));

// Initialize Firebase Admin with applet configuration
let firebaseProjectId: string | null = null;
let dbAdmin: admin.firestore.Firestore | null = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    firebaseProjectId = firebaseConfig.projectId;
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
    if (firebaseConfig.firestoreDatabaseId) {
      dbAdmin = new admin.firestore.Firestore({
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId
      });
    } else {
      dbAdmin = admin.firestore();
    }
    console.log("Firebase Admin successfully initialized on server.");
  } else {
    console.warn("firebase-applet-config.json not found. Database features will be unavailable.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

// Local filesystem-based mock database helper when live Firestore is inaccessible
const LOCAL_DB_DIR = path.join(process.cwd(), '.local_db');
if (!fs.existsSync(LOCAL_DB_DIR)) {
  fs.mkdirSync(LOCAL_DB_DIR);
}

function getLocalMockFile(collection: string): any[] {
  const filePath = path.join(LOCAL_DB_DIR, `${collection}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveLocalMockFile(collection: string, data: any[]) {
  const filePath = path.join(LOCAL_DB_DIR, `${collection}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function safeGetCollection(collectionName: string): Promise<any[]> {
  try {
    if (!dbAdmin) {
      return getLocalMockFile(collectionName);
    }
    const snapshot = await dbAdmin.collection(collectionName).get();
    const docs: any[] = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  } catch (err: any) {
    if (err.message?.includes("default credentials") || err.message?.includes("credentials") || err.code === 'credentials') {
      console.warn(`[Firestore Fallback] Using local mock database for "${collectionName}" (Firestore credentials not loaded).`);
      return getLocalMockFile(collectionName);
    }
    throw err;
  }
}

async function safeAddDocument(collectionName: string, docId: string | null, data: any): Promise<string> {
  try {
    if (!dbAdmin) {
      const mockDb = getLocalMockFile(collectionName);
      const id = docId || `mock_${Date.now()}`;
      mockDb.push({ id, ...data });
      saveLocalMockFile(collectionName, mockDb);
      return id;
    }
    if (docId) {
      await dbAdmin.collection(collectionName).doc(docId).set(data);
      return docId;
    } else {
      const docRef = await dbAdmin.collection(collectionName).add(data);
      return docRef.id;
    }
  } catch (err: any) {
    if (err.message?.includes("default credentials") || err.message?.includes("credentials") || err.code === 'credentials') {
      console.warn(`[Firestore Fallback] Using local mock database for writing to "${collectionName}" (Firestore credentials not loaded).`);
      const mockDb = getLocalMockFile(collectionName);
      const id = docId || `mock_${Date.now()}`;
      mockDb.push({ id, ...data });
      saveLocalMockFile(collectionName, mockDb);
      return id;
    }
    throw err;
  }
}

async function safeUpdateDocument(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    if (!dbAdmin) {
      const mockDb = getLocalMockFile(collectionName);
      const idx = mockDb.findIndex(item => item.id === docId);
      if (idx !== -1) {
        mockDb[idx] = { ...mockDb[idx], ...data };
        saveLocalMockFile(collectionName, mockDb);
      }
      return;
    }
    await dbAdmin.collection(collectionName).doc(docId).update(data);
  } catch (err: any) {
    if (err.message?.includes("default credentials") || err.message?.includes("credentials") || err.code === 'credentials') {
      console.warn(`[Firestore Fallback] Using local mock database for updating "${collectionName}" (Firestore credentials not loaded).`);
      const mockDb = getLocalMockFile(collectionName);
      const idx = mockDb.findIndex(item => item.id === docId);
      if (idx !== -1) {
        mockDb[idx] = { ...mockDb[idx], ...data };
        saveLocalMockFile(collectionName, mockDb);
      }
      return;
    }
    throw err;
  }
}

async function safeDeleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    if (!dbAdmin) {
      const mockDb = getLocalMockFile(collectionName);
      const filtered = mockDb.filter(item => item.id !== docId);
      saveLocalMockFile(collectionName, filtered);
      return;
    }
    await dbAdmin.collection(collectionName).doc(docId).delete();
  } catch (err: any) {
    if (err.message?.includes("default credentials") || err.message?.includes("credentials") || err.code === 'credentials') {
      console.warn(`[Firestore Fallback] Using local mock database for deleting from "${collectionName}" (Firestore credentials not loaded).`);
      const mockDb = getLocalMockFile(collectionName);
      const filtered = mockDb.filter(item => item.id !== docId);
      saveLocalMockFile(collectionName, filtered);
      return;
    }
    throw err;
  }
}

const authorizedHosts = new Set<string>(["localhost", "127.0.0.1"]);

async function authorizeDomain(domain: string) {
  if (!firebaseProjectId) {
    console.warn(`[Domain Auth] Cannot authorize ${domain}: firebaseProjectId is not set.`);
    return;
  }
  
  // Skip standard IP addresses, local domains or empty values
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || /^[0-9.]+$/.test(domain)) {
    return;
  }

  try {
    console.log(`[Domain Auth] Attempting to authorize domain "${domain}" on Firebase...`);
    const credential = admin.app().options.credential || admin.credential.applicationDefault();
    const tokenObj = await credential.getAccessToken();
    const token = (tokenObj as any).accessToken || (tokenObj as any).access_token || (tokenObj as any).token;

    if (!token) {
      console.warn("[Domain Auth] Could not retrieve access token for Identity Toolkit config API.");
      return;
    }

    const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${firebaseProjectId}/config`;
    
    // Fetch current project authentication config
    const getRes = await fetch(configUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!getRes.ok) {
      const errorText = await getRes.text();
      console.warn(`[Domain Auth] Failed to fetch Identity Toolkit config: ${getRes.status} - ${errorText}`);
      return;
    }

    const config = await getRes.json();
    const currentDomains: string[] = config.authorizedDomains || [];

    if (!currentDomains.includes(domain)) {
      const updatedDomains = [...currentDomains, domain];
      console.log(`[Domain Auth] Adding ${domain} to whitelist. New list:`, updatedDomains);

      const patchRes = await fetch(`${configUrl}?updateMask=authorizedDomains`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          authorizedDomains: updatedDomains
        })
      });

      if (patchRes.ok) {
        console.log(`[Domain Auth] Successfully whitelisted domain: ${domain}`);
      } else {
        const errorText = await patchRes.text();
        console.warn(`[Domain Auth] Failed to patch authorized domains: ${patchRes.status} - ${errorText}`);
      }
    } else {
      console.log(`[Domain Auth] Domain "${domain}" is already authorized.`);
    }
  } catch (err: any) {
    // This is expected during local development without GCP credentials, so we log it as a warning
    console.warn(`[Domain Auth] Firebase domain authorization failed for "${domain}" (this is normal if running locally without GCP credentials):`, err.message || err);
  }
}

/**
 * Sends an email notification to the moderator.
 */
async function sendNotificationEmail(subject: string, textBody: string, htmlBody: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const toEmail = process.env.SMTP_TO || "mappingtherabbithole@gmail.com";

  if (!host || !user || !pass) {
    console.warn("[Email Notification] SMTP credentials not fully configured in environment variables. Skipping email dispatch.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    const info = await transporter.sendMail({
      from: `"MTRH Map Notifications" <${user}>`,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody
    });

    console.log(`[Email Notification] Email successfully sent to ${toEmail}: ${info.messageId}`);
  } catch (error) {
    console.error("[Email Notification] Failed to send email notification:", error);
  }
}

async function startServer() {
  const app = express();

  // Cloud Run sits behind a trusted load balancer — needed so req.ip (and the
  // rate limiter) sees the real client IP from X-Forwarded-For.
  app.set("trust proxy", 1);

  // Dynamic host verification for Firebase Authentication domains
  app.use((req, res, next) => {
    const host = req.hostname || req.headers.host?.split(":")[0];
    if (host && !authorizedHosts.has(host)) {
      authorizedHosts.add(host);
      authorizeDomain(host).catch(err => {
        console.error(`[Domain Auth] Error in background authorizeDomain for ${host}:`, err);
        authorizedHosts.delete(host);
      });
    }
    next();
  });

  // Gzip responses (JS bundles and JSON data chunks compress roughly 4:1).
  app.use(compression());

  // Rate limits for the public, unauthenticated endpoints.
  const publicWriteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
  const proxyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });
  app.use(["/api/submissions/create", "/api/reports/create", "/api/upload"], publicWriteLimiter);
  app.use(["/api/proxy-resource", "/api/uap-archive"], proxyLimiter);

  // Set payload sizes to allow base64 file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Ensure uploads directory exists and is statically served
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // File Upload Route
  app.post("/api/upload", async (req, res) => {
    try {
      const { filename, fileData } = req.body;
      if (!filename || !fileData) {
        return res.status(400).json({ error: "Missing filename or fileData" });
      }

      // Extract pure base64 representation if data url prefix is present
      const matches = fileData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
      let base64Content = fileData;
      if (matches && matches.length === 3) {
        base64Content = matches[2];
      }

      const buffer = Buffer.from(base64Content, 'base64');
      const sanitizedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsDir, sanitizedFilename);

      await fs.promises.writeFile(filePath, buffer);
      console.log(`Uploaded file saved to: ${filePath}`);

      res.json({ url: `/uploads/${sanitizedFilename}` });
    } catch (err: any) {
      console.error("Upload handler failed:", err);
      res.status(500).json({ error: "Could not persist uploaded file" });
    }
  });

  async function verifyAdminAccess(req: express.Request): Promise<boolean> {
    const { passcode } = req.body;
    const authHeader = req.headers.authorization;
    const expectedPasscode = process.env.ADMIN_PASSCODE || "MTRH2026";

    // 1. Passcode check (body or auth header)
    if (passcode === expectedPasscode || authHeader === expectedPasscode) {
      return true;
    }

    // 2. Firebase ID Token check
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        if (decodedToken && decodedToken.email === "jhuffman710@gmail.com") {
          return true;
        }
      } catch (err: any) {
        console.warn("[Admin Auth] Failed to verify ID Token:", err.message || err);
      }
    }

    return false;
  }

  // Secure Server-side Moderation Routes bypassing OAuth unauthorized-domain constraints
  app.post("/api/moderate/approve", async (req, res) => {
    try {
      const { docId } = req.body;
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }
      if (!docId) {
        return res.status(400).json({ error: "Missing document ID." });
      }

      await safeUpdateDocument('submissions', docId, {
        status: 'approved'
      });

      console.log(`Submissions Server-Bypass: Approved document ${docId}`);
      res.json({ success: true, status: 'approved' });
    } catch (err: any) {
      console.error("Server-side approval failed:", err);
      res.status(500).json({ error: err.message || "Failed to approve submission on server" });
    }
  });

  app.post("/api/moderate/revoke", async (req, res) => {
    try {
      const { docId } = req.body;
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }
      if (!docId) {
        return res.status(400).json({ error: "Missing document ID." });
      }

      await safeUpdateDocument('submissions', docId, {
        status: 'pending'
      });

      console.log(`Submissions Server-Bypass: Revoked document ${docId} to pending`);
      res.json({ success: true, status: 'pending' });
    } catch (err: any) {
      console.error("Server-side revocation failed:", err);
      res.status(500).json({ error: err.message || "Failed to revoke submission on server" });
    }
  });

  app.post("/api/moderate/update", async (req, res) => {
    try {
      const { docId, updatedData } = req.body;
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }
      if (!docId) {
        return res.status(400).json({ error: "Missing document ID." });
      }
      if (!updatedData) {
        return res.status(400).json({ error: "Missing updated data." });
      }

      await safeUpdateDocument('submissions', docId, updatedData);

      console.log(`Submissions Server-Bypass: Updated document ${docId}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Server-side update failed:", err);
      res.status(500).json({ error: err.message || "Failed to update submission on server" });
    }
  });

  app.post("/api/moderate/reject", async (req, res) => {
    try {
      const { docId } = req.body;
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }
      if (!docId) {
        return res.status(400).json({ error: "Missing document ID." });
      }

      await safeDeleteDocument('submissions', docId);

      console.log(`Submissions Server-Bypass: Deleted/Rejected document ${docId}`);
      res.json({ success: true, status: 'deleted' });
    } catch (err: any) {
      console.error("Server-side rejection failed:", err);
      res.status(500).json({ error: err.message || "Failed to reject/delete submission on server" });
    }
  });

  app.post("/api/submissions/create", async (req, res) => {
    try {
      const {
        name,
        category,
        description,
        coordinates,
        images,
        date,
        source,
        socialLink,
        destinations,
        codexParentId,
        timelineLayer,
        timelineType,
        timelineEnd,
        timelineFatherId,
        timelineMotherId,
        timelineSpouseId,
        submitterName,
        submitterEmail
      } = req.body;

      if (!name || !category || !description) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const submissionId = `user_${Date.now()}`;
      const submissionData: any = {
        name: name.trim(),
        category: category,
        description: description.trim(),
        images: images || [],
        status: 'pending',
        createdAt: dbAdmin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
        destinations: destinations || ['map'],
        codexParentId: codexParentId || '',
        timelineLayer: timelineLayer || '',
        timelineType: timelineType || 'event',
        timelineEnd: timelineEnd || '',
        timelineFatherId: timelineFatherId || '',
        timelineMotherId: timelineMotherId || '',
        timelineSpouseId: timelineSpouseId || '',
        submitterName: (submitterName && typeof submitterName === 'string') ? submitterName.trim() : '',
        submitterEmail: (submitterEmail && typeof submitterEmail === 'string') ? submitterEmail.trim() : ''
      };

      if (coordinates !== undefined && coordinates !== null) {
        submissionData.coordinates = coordinates;
      }

      if (date && typeof date === 'string' && date.trim()) {
        submissionData.date = date.trim();
      }
      if (source && typeof source === 'string' && source.trim()) {
        submissionData.source = source.trim();
      }
      if (socialLink && typeof socialLink === 'string' && socialLink.trim()) {
        submissionData.socialLink = socialLink.trim();
      }

      await safeAddDocument('submissions', submissionId, submissionData);

      // Trigger email notification in the background
      const appUrl = process.env.APP_URL || "https://mappingtherabbithole.com";
      const modLink = `${appUrl}/moderator`;
      
      const subject = `[MTRH] New Intel Submission: ${submissionData.name}`;
      const textBody = `A new piece of intel has been submitted for moderation review.

Name of Anomaly / Signature: ${submissionData.name}
Destinations: ${(submissionData.destinations || []).join(', ') || "map"}
Map Category / Layer: ${submissionData.category}
Date/Timeframe: ${submissionData.date || "Not provided"}
Source/Provenance: ${submissionData.source || "Not provided"}
Coordinates: ${submissionData.coordinates ? JSON.stringify(submissionData.coordinates) : "Not provided"}
Social Link: ${submissionData.socialLink || "Not provided"}
Submitter Name: ${submissionData.submitterName || "Not provided"}
Submitter Email: ${submissionData.submitterEmail || "Not provided"}

--- Codex Placement ---
Parent Codex Term ID: ${submissionData.codexParentId || "None (Root category)"}

--- Timeline Placement ---
Timeline Era / Layer: ${submissionData.timelineLayer || "None"}
Timeline Type: ${submissionData.timelineType || "event"}
Timeline End Year: ${submissionData.timelineEnd || "N/A"}
Father ID: ${submissionData.timelineFatherId || "None"}
Mother ID: ${submissionData.timelineMotherId || "None"}
Spouse ID: ${submissionData.timelineSpouseId || "None"}

Description:
${submissionData.description}

Attachments:
${submissionData.images && submissionData.images.length > 0 ? submissionData.images.join("\n") : "None"}

Please review and approve or reject this submission in the Moderation Desk:
${modLink}
`;

      const htmlBody = `
        <div style="font-family: monospace; padding: 20px; background-color: #000; color: #fff; border: 1px solid #fff;">
          <h2 style="color: #ffcc00; border-bottom: 2px solid #ffcc00; padding-bottom: 10px; font-weight: bold; letter-spacing: 1px;">MTRH // New Intel Submitted</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px; font-weight: bold; width: 180px; color: #ffcc00;">Anomaly Name:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.name}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Destinations:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222; color: #ffcc00;"><strong>${(submissionData.destinations || []).join(', ')}</strong></td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Map Category:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.category}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Date/Timeframe:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.date || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Coordinates:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.coordinates ? `[${submissionData.coordinates.join(', ')}]` : "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Source:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.source || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Social Link:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.socialLink || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Submitter Name:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.submitterName || "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ffcc00;">Submitter Email:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${submissionData.submitterEmail ? `<a href="mailto:${submissionData.submitterEmail}" style="color: #ffcc00;">${submissionData.submitterEmail}</a>` : "Not provided"}</td>
            </tr>
          </table>

          <div style="margin-bottom: 20px; border: 1px solid #333; padding: 12px; background: #111;">
            <h4 style="color: #ffcc00; font-weight: bold; margin: 0 0 10px 0; border-bottom: 1px solid #333; padding-bottom: 4px;">Codex Placement</h4>
            <div>Parent Term ID: <code>${submissionData.codexParentId || "None (Root)"}</code></div>
          </div>

          <div style="margin-bottom: 20px; border: 1px solid #333; padding: 12px; background: #111;">
            <h4 style="color: #ffcc00; font-weight: bold; margin: 0 0 10px 0; border-bottom: 1px solid #333; padding-bottom: 4px;">Timeline Placement</h4>
            <table style="width: 100%; font-size: 11px;">
              <tr><td style="width: 150px; color: #aaa;">Layer/Era:</td><td>${submissionData.timelineLayer || "None"}</td></tr>
              <tr><td style="color: #aaa;">Type:</td><td>${submissionData.timelineType}</td></tr>
              <tr><td style="color: #aaa;">End Year:</td><td>${submissionData.timelineEnd || "N/A"}</td></tr>
              <tr><td style="color: #aaa;">Father ID:</td><td>${submissionData.timelineFatherId || "None"}</td></tr>
              <tr><td style="color: #aaa;">Mother ID:</td><td>${submissionData.timelineMotherId || "None"}</td></tr>
              <tr><td style="color: #aaa;">Spouse ID:</td><td>${submissionData.timelineSpouseId || "None"}</td></tr>
            </table>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #ffcc00; font-weight: bold; margin-bottom: 8px;">Description</h4>
            <p style="white-space: pre-wrap; background: #111; padding: 12px; border: 1px solid #333; line-height: 1.6;">${submissionData.description}</p>
          </div>
          ${submissionData.images && submissionData.images.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #ffcc00; font-weight: bold; margin-bottom: 8px;">Staged Attachments</h4>
            <ul style="list-style-type: none; padding: 0;">
              ${submissionData.images.map((img: string) => `<li><a href="${img.startsWith('/') ? appUrl + img : img}" style="color: #3b82f6; text-decoration: none;" target="_blank">${img}</a></li>`).join('')}
            </ul>
          </div>` : ''}
          <div style="margin-top: 30px; text-align: center;">
            <a href="${modLink}" style="display: inline-block; background: #ffcc00; color: #000; font-weight: bold; text-decoration: none; padding: 10px 24px; border: 2px solid #ffcc00; letter-spacing: 0.5px;">OPEN DECISIONAL MODERATION DESK</a>
          </div>
        </div>
      `;

      sendNotificationEmail(subject, textBody, htmlBody).catch(err => {
        console.error("Failed to send submission email in background:", err);
      });

      console.log(`Submissions Server-Bypass: Created submission ${submissionId}`);
      res.json({ success: true, id: submissionId });
    } catch (err: any) {
      console.error("Server-side submission creation failed:", err);
      res.status(500).json({ error: err.message || "Failed to create submission on server" });
    }
  });

  app.post("/api/moderate/pending", async (req, res) => {
    try {
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }

      const allDocs = await safeGetCollection('submissions');
      const pendingDocs = allDocs.filter(data => data.status === "pending");

      console.log(`Submissions Server-Bypass: Returned ${pendingDocs.length} pending submissions.`);
      res.json({ success: true, pending: pendingDocs });
    } catch (err: any) {
      console.error("Server-side pending fetch failed:", err);
      res.status(500).json({ error: err.message || "Failed to fetch pending submissions on server" });
    }
  });

  // Inaccuracy Reporting API Endpoints
  app.post("/api/reports/create", async (req, res) => {
    try {
      const { pointId, pointName, pointCategory, reason, details } = req.body;
      if (!pointId || !pointName || !pointCategory || !reason) {
        return res.status(400).json({ error: "Missing required report fields." });
      }

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const reportData = {
        pointId: String(pointId).trim(),
        pointName: String(pointName).trim(),
        pointCategory: String(pointCategory).trim(),
        reason: String(reason).trim(),
        details: (details || "").trim(),
        status: 'pending',
        createdAt: dbAdmin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
      };

      await safeAddDocument('reports', reportId, reportData);

      // Trigger inaccuracy report email notification in the background
      const appUrl = process.env.APP_URL || "https://mappingtherabbithole.com";
      const modLink = `${appUrl}/moderator`;
      
      const subject = `[MTRH] Inaccuracy Flag: ${reportData.pointName}`;
      const textBody = `An inaccuracy flag (report) has been submitted for moderation review.

Point Name: ${reportData.pointName}
Point Category: ${reportData.pointCategory}
Point ID: ${reportData.pointId}
Reason: ${reportData.reason}

Details provided by reporter:
${reportData.details || "No details provided"}

Please review this report in the Decisional Moderation Desk:
${modLink}
`;

      const htmlBody = `
        <div style="font-family: monospace; padding: 20px; background-color: #000; color: #fff; border: 1px solid #fff;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px; font-weight: bold; letter-spacing: 1px;">MTRH // Point Flagged for Inaccuracy</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px; font-weight: bold; width: 180px; color: #ef4444;">Point Name:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${reportData.pointName}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ef4444;">Category:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;">${reportData.pointCategory}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ef4444;">Point ID:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222;"><code>${reportData.pointId}</code></td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold; color: #ef4444;">Reason for Flag:</td>
              <td style="padding: 6px; border-bottom: 1px solid #222; font-weight: bold;">${reportData.reason}</td>
            </tr>
          </table>
          <div style="margin-bottom: 20px;">
            <h4 style="color: #ef4444; font-weight: bold; margin-bottom: 8px;">Reporter Details</h4>
            <p style="white-space: pre-wrap; background: #111; padding: 12px; border: 1px solid #333; line-height: 1.6;">${reportData.details || "No details provided"}</p>
          </div>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${modLink}" style="display: inline-block; background: #ef4444; color: #fff; font-weight: bold; text-decoration: none; padding: 10px 24px; border: 2px solid #ef4444; letter-spacing: 0.5px;">OPEN DECISIONAL MODERATION DESK</a>
          </div>
        </div>
      `;

      sendNotificationEmail(subject, textBody, htmlBody).catch(err => {
        console.error("Failed to send report email in background:", err);
      });

      console.log(`Reports Server-Bypass: Created report ${reportId} for point ${pointId}`);
      res.json({ success: true, id: reportId });
    } catch (err: any) {
      console.error("Server-side report creation failed:", err);
      res.status(500).json({ error: err.message || "Failed to create report on server" });
    }
  });

  app.post("/api/moderate/reports", async (req, res) => {
    try {
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }

      const allReports = await safeGetCollection('reports');
      const docs = allReports.map(data => {
        const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
          ? data.createdAt.toDate().toISOString() 
          : data.createdAt;
          
        return {
          ...data,
          createdAt
        };
      });

      // Sort by createdAt descending
      docs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      console.log(`Reports Server-Bypass: Returned ${docs.length} reports.`);
      res.json({ success: true, reports: docs });
    } catch (err: any) {
      console.error("Server-side reports fetch failed:", err);
      res.status(500).json({ error: err.message || "Failed to fetch reports on server" });
    }
  });

  app.post("/api/moderate/report-action", async (req, res) => {
    try {
      const { reportId, action } = req.body;
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }
      if (!reportId || !action) {
        return res.status(400).json({ error: "Missing report ID or action." });
      }

      if (action === 'resolve') {
        await safeUpdateDocument('reports', reportId, {
          status: 'resolved'
        });
        console.log(`Reports Server-Bypass: Resolved report ${reportId}`);
        res.json({ success: true, status: 'resolved' });
      } else if (action === 'delete') {
        await safeDeleteDocument('reports', reportId);
        console.log(`Reports Server-Bypass: Deleted report ${reportId}`);
        res.json({ success: true, status: 'deleted' });
      } else {
        return res.status(400).json({ error: "Invalid action type. Expected 'resolve' or 'delete'." });
      }
    } catch (err: any) {
      console.error("Server-side report action failed:", err);
      res.status(500).json({ error: err.message || "Failed to execute report action on server" });
    }
  });

  app.get("/api/overrides", async (req, res) => {
    try {
      const list = await safeGetCollection('overrides');
      const overridesMap: Record<string, any> = {};
      list.forEach(item => {
        overridesMap[item.id] = item;
      });
      res.json({ success: true, overrides: overridesMap });
    } catch (err: any) {
      console.error("Server-side overrides fetch failed:", err);
      res.status(500).json({ error: err.message || "Failed to fetch overrides on server" });
    }
  });

  app.post("/api/moderate/save-override", async (req, res) => {
    try {
      const { overrideId, updatedData } = req.body;
      const isAuthorized = await verifyAdminAccess(req);
      if (!isAuthorized) {
        return res.status(403).json({ error: "BYPASS CODE DENIED OR UNAUTHORIZED SESSION." });
      }
      if (!overrideId) {
        return res.status(400).json({ error: "Missing override ID." });
      }
      if (!updatedData) {
        return res.status(400).json({ error: "Missing updated data." });
      }

      if (!dbAdmin) {
        const mockDb = getLocalMockFile('overrides');
        const idx = mockDb.findIndex(item => item.id === overrideId);
        if (idx !== -1) {
          mockDb[idx] = { id: overrideId, ...updatedData };
        } else {
          mockDb.push({ id: overrideId, ...updatedData });
        }
        saveLocalMockFile('overrides', mockDb);
      } else {
        await dbAdmin.collection('overrides').doc(overrideId).set(updatedData);
      }

      console.log(`Overrides Server-Bypass: Saved override for ${overrideId}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Server-side save override failed:", err);
      res.status(500).json({ error: err.message || "Failed to save override on server" });
    }
  });

  // Rejects proxy targets that could reach internal infrastructure (SSRF):
  // non-http(s) schemes, localhost, private/link-local IP literals, and cloud
  // metadata hostnames. Public hostnames are allowed through unchanged.
  const isForbiddenProxyTarget = (rawUrl: string): boolean => {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return true;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      host === "localhost" || host.endsWith(".localhost") ||
      host === "metadata.google.internal" || host.endsWith(".internal") ||
      host === "::1" || host.startsWith("fe80:") || host.startsWith("fd") || host.startsWith("fc")
    ) return true;
    // IPv4 literals: block loopback, private, link-local, and 0.0.0.0/8 ranges
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
      if (
        a === 0 || a === 10 || a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)
      ) return true;
    }
    return false;
  };

  // Image/Video Proxy Route to bypass hotlinking, CORS, and support range requests
  app.get("/api/proxy-resource", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send("URL is required");
    if (isForbiddenProxyTarget(url)) return res.status(403).send("Forbidden proxy target");

    try {
      // Determine probable Referer based on domain
      let referer = 'https://uap-files.pages.dev/';
      if (url.includes('aaro.mil')) referer = 'https://www.aaro.mil/';
      if (url.includes('archives.gov')) referer = 'https://www.archives.gov/';
      if (url.includes('wikimedia.org')) referer = 'https://commons.wikimedia.org/';
      if (url.includes('wikipedia.org')) referer = 'https://en.wikipedia.org/';
      if (url.toLowerCase().includes('usercontent') || url.toLowerCase().includes('googleusercontent')) {
        referer = 'https://mymaps.google.com/';
      }

      const domain = new URL(url).hostname;
      
      const headers: Record<string, string> = {
        'User-Agent': 'MTRH-Interactive-Map/1.0 (contact: info@mtrhmap.org; development)',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': referer,
        'Host': domain
      };

      // Forward client Range header if requested
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await fetch(url, { headers });
      
      // Set status code matching upstream response (e.g. 206 for Partial Content, 200 for full resource)
      res.statusCode = response.status;
      
      const copyHeader = (name: string) => {
        const val = response.headers.get(name);
        if (val) res.setHeader(name, val);
      };

      copyHeader('content-type');
      copyHeader('content-length');
      copyHeader('content-range');
      copyHeader('accept-ranges');
      copyHeader('cache-control');

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("Cross-Origin-Resource-Policy");

      // Stream response body back to client chunk by chunk
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (e) {
      console.error(`Proxy failed for ${url}:`, e);
      if (!res.headersSent) {
        res.status(500).send("Proxy technical error");
      }
    }
  });

  // API Route for UAP Archive Scraping
  app.get("/api/uap-archive", async (req, res) => {
    try {
      console.log('Fetching UAP Archive from https://uap-files.pages.dev/ ...');
      const response = await fetch('https://uap-files.pages.dev/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const records: any[] = [];
      
      // Attempt 1: Check for NEXT_DATA (Common in modern static sites)
      const nextData = $('#__NEXT_DATA__').html();
      if (nextData) {
        try {
          const parsed = JSON.parse(nextData);
          // Recursively find any arrays that look like records
          const findData = (obj: any): any[] | null => {
            if (!obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj)) {
              if (obj.length > 5 && (obj[0].title || obj[0].name || obj[0].id)) return obj;
              for (const item of obj) {
                const result = findData(item);
                if (result) return result;
              }
            }
            for (const key in obj) {
              const result = findData(obj[key]);
              if (result) return result;
            }
            return null;
          };

          const rawData = findData(parsed);
          if (rawData && Array.isArray(rawData)) {
             rawData.forEach((item: any, idx: number) => {
               if (!item.title && !item.name && !item.description) return;
               records.push({
                 id: item.id || `uap-idx-${idx}`,
                 name: item.title || item.name || "UAP Incident",
                 category: item.category || "UFOs - Sightings",
                 description: item.description || item.comments || item.summary || "",
                 date: item.date || item.year || item.occurred_at || 2024,
                 coordinates: item.coordinates || [item.lng || item.longitude || -77.0, item.lat || item.latitude || 38.9],
                 images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
                 source: "UAP Archive / Scraping"
               });
             });
          }
        } catch (e) {
          console.error('Error parsing NEXT_DATA:', e);
        }
      }

      // Effort to pull from AARO directly (Experimental)
      try {
        const aaroRes = await fetch('https://www.aaro.mil/UAP-Cases/', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (aaroRes.ok) {
          const aaroHtml = await aaroRes.text();
          const $aaro = cheerio.load(aaroHtml);
          $aaro('.card, .case-item').each((i, el) => {
            const title = $aaro(el).find('h3, .title').text().trim();
            if (title) {
              records.push({
                id: `aaro-live-${i}`,
                name: title,
                category: "War.gov UFO Files",
                description: "Official AARO Case Study",
                source: "AARO.mil",
                coordinates: [0, 0] // Geocoding NOT available in simple scrape
              });
            }
          });
        }
      } catch (aaroErr) {
        console.warn("Direct AARO scrape failed, relying on fallback/archive.");
      }
      
      /* Removed hardcoded seat fallbacks as they cause duplicates and use broken links. Local warGovData.json provides primary coverage. */
      
      // Attempt 2: DOM Scraping (Fallback)
      if (records.length === 0) {
        // Target specifically the selectors mentioned in Gemini's advice if they exist
        $('.data-point-card, div[class*="card"], div[class*="record"], article').each((i, el) => {
          const title = $(el).find('h2, h3, .title, .name').first().text().trim();
          const description = $(el).find('p, .description, .summary').first().text().trim();
          const image = $(el).find('img').attr('src');
          const video = $(el).find('video source').attr('src');
          
          if (title || description) {
            // If image is relative, make it absolute
            let finalImage = image;
            if (finalImage && !finalImage.startsWith('http')) {
              finalImage = new URL(finalImage, 'https://uap-files.pages.dev/').href;
            }

              records.push({
                id: `uap-dom-${i}`,
                name: title || "UAP Incident",
                category: "UFOs - Sightings",
                description: description,
              images: finalImage ? [finalImage] : [],
              video: video,
              source: "UAP Archive Scraping",
              coordinates: [ -77.0369, 38.9072 ] // Default to DC area if no coords found in DOM
            });
          }
        });
      }

      console.log(`Scraping complete. Found ${records.length} records.`);
      res.json({ records });
    } catch (error) {
      console.error('Scraping error:', error);
      res.status(500).json({ error: 'Failed to scrape UAP archive' });
    }
  });

  // Share ONE Node HTTP server for both Express and Vite's HMR websocket. In
  // middlewareMode Vite otherwise opens its own ws on a separate port (24678) that
  // a single-port tunnel (e.g. *.trycloudflare.com) can't reach — so HMR silently
  // failed over the tunnel. Putting the ws on this shared server means it rides on
  // PORT, and the Vite client auto-connects to the page's own origin: plain ws on
  // localhost/LAN, wss through the tunnel on 443. No client-side port config needed.
  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      // allowedHosts:true lets tunnels (e.g. *.trycloudflare.com) reach the dev
      // server; the host-check is a dev-only guard and we intentionally share it.
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files with a long-term cache (1 year) since they are hashed and immutable.
    // Disable serving index.html automatically via index: false so we can control its caching headers.
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      index: false
    }));

    app.get('*', (req, res) => {
      // If the request points to a static asset that wasn't found by express.static,
      // return a proper 404 instead of falling back to index.html (which causes JS parser errors).
      if (req.path.startsWith('/assets/') || path.extname(req.path)) {
        res.status(404).send('Not Found');
        return;
      }

      // Serve index.html with cache-disabling headers so normal reloads always fetch the latest assets
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
