/**
 * One-time bootstrap: sign in and assign superAdmin role.
 * Usage (do NOT commit credentials):
 *   $env:BOOTSTRAP_EMAIL="you@example.com"
 *   $env:BOOTSTRAP_PASSWORD="your-password"
 *   node scripts/bootstrap-super-admin.mjs
 */
import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

function loadEnv() {
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const val = trimmed.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const email = process.env.BOOTSTRAP_EMAIL;
const password = process.env.BOOTSTRAP_PASSWORD;

if (!email || !password) {
  console.error("Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD environment variables.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SUPER_ADMIN = "superAdmin";

// Minimal permission list for super admin (matches src/lib/rbac-seed.ts)
const ALL_PERMISSIONS = [
  "view_dashboard", "view_inventory", "manage_inventory", "adjust_stock",
  "view_inventory_reports", "view_sales", "create_sales", "print_receipts",
  "view_customers", "manage_customers", "view_suppliers", "manage_suppliers",
  "view_purchases", "manage_purchases", "approve_purchases", "view_quotations",
  "manage_quotations", "view_proforma", "manage_proforma", "view_invoices",
  "manage_invoices", "view_receipts", "manage_receipts", "view_custom_orders",
  "manage_custom_orders", "view_accounting", "manage_accounting",
  "view_financial_reports", "post_journal_entries", "approve_expenses",
  "view_reports", "export_reports", "view_settings", "manage_settings",
  "manage_users", "manage_roles", "manage_permissions", "view_audit_logs",
  "view_expenses", "manage_expenses", "view_analytics", "view_notifications",
];

async function seedRbac(db) {
  const now = serverTimestamp();
  const permSnap = await getDoc(doc(db, "roles", SUPER_ADMIN));
  if (permSnap.exists()) {
    console.log("RBAC already initialized.");
    return;
  }

  console.log("Seeding RBAC system...");
  for (const id of ALL_PERMISSIONS) {
    await setDoc(doc(db, "permissions", id), {
      id,
      name: id.replace(/_/g, " "),
      module: "system",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await setDoc(doc(db, "roles", SUPER_ADMIN), {
    name: "Super Admin",
    description: "Unrestricted system access",
    active: true,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, "rolePermissions", SUPER_ADMIN), {
    roleId: SUPER_ADMIN,
    permissions: ALL_PERMISSIONS,
    updatedAt: now,
  });
  console.log("RBAC seeded.");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Signing in as ${email}...`);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  console.log(`Signed in. UID: ${uid}`);

  await seedRbac(db);

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  const displayName = cred.user.displayName ?? "Elisa Admin";
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] ?? "Elisa";
  const lastName = parts.slice(1).join(" ") || "Admin";

  const profile = {
    uid,
    firstName,
    lastName,
    email,
    roles: [SUPER_ADMIN],
    effectivePermissions: ALL_PERMISSIONS,
    active: true,
    updatedAt: serverTimestamp(),
  };

  if (userSnap.exists()) {
    await updateDoc(userRef, profile);
    console.log("Updated existing profile → superAdmin");
  } else {
    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
    });
    console.log("Created new profile → superAdmin");
  }

  console.log("\nDone! Sign in at http://localhost:3000/login");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nBootstrap failed:", err.message || err);
  if (String(err.message).includes("permission")) {
    console.error(
      "\n→ Publish firestore.rules in Firebase Console first:\n" +
        "  https://console.firebase.google.com/project/home-stitch/firestore/rules"
    );
  }
  process.exit(1);
});
