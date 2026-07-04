import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COMPANY } from "@/lib/navigation";
import type { CompanyProfile } from "@/types/domain";

const DEFAULT_PROFILE: Omit<CompanyProfile, "id" | "updatedAt"> = {
  name: COMPANY.name,
  tagline: COMPANY.tagline,
  email: "homestitchinteriorsug@gmail.com",
  phone: "+256 757 148631",
  phoneSecondary: "+256 754 604928",
  address: "Busega Round about, Kampala, Uganda",
  currency: "UGX",
  taxRate: 0,
  mobileMoneyProvider: "Airtel Money",
  mobileMoneyNumber: "0757148631",
  mobileMoneyName: "NABAYINDA",
  bankName: "Centenary Bank",
  bankAccount: "3204452887",
  bankAccountName: "NAMUGENYI GRACE",
  socialTiktok: "@home.stitchinteriors01",
  socialFacebook: "Home stitch interiors ug",
  socialTwitter: "@HomeStitchug",
};

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const db = getFirebaseDb();
  const ref = doc(db, "settings", "company");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { id: "company", ...DEFAULT_PROFILE, updatedAt: new Date() };
  }

  const data = snap.data();
  return {
    id: "company",
    name: (data.name as string) ?? DEFAULT_PROFILE.name,
    tagline: (data.tagline as string) ?? DEFAULT_PROFILE.tagline,
    logoUrl: data.logoUrl as string | undefined,
    email: (data.email as string) ?? DEFAULT_PROFILE.email,
    phone: (data.phone as string) ?? DEFAULT_PROFILE.phone,
    phoneSecondary: data.phoneSecondary as string | undefined,
    address: (data.address as string) ?? DEFAULT_PROFILE.address,
    taxId: data.taxId as string | undefined,
    currency: (data.currency as string) ?? "UGX",
    taxRate: Number(data.taxRate ?? 18),
    bankName: data.bankName as string | undefined,
    bankAccount: data.bankAccount as string | undefined,
    bankAccountName: data.bankAccountName as string | undefined,
    bankBranch: data.bankBranch as string | undefined,
    mobileMoneyProvider: data.mobileMoneyProvider as string | undefined,
    mobileMoneyNumber: data.mobileMoneyNumber as string | undefined,
    mobileMoneyName: data.mobileMoneyName as string | undefined,
    socialTiktok: data.socialTiktok as string | undefined,
    socialFacebook: data.socialFacebook as string | undefined,
    socialTwitter: data.socialTwitter as string | undefined,
    socialInstagram: data.socialInstagram as string | undefined,
    updatedAt:
      (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

export async function saveCompanyProfile(
  data: Partial<CompanyProfile>
): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, "settings", "company"),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
