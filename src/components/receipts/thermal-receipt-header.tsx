import type { ReactNode } from "react";
import type { CompanyProfile } from "@/types/domain";
import { companyLogoUrl } from "@/lib/pos-logo";

function companyPhones(company: Pick<CompanyProfile, "phone" | "phoneSecondary">) {
  const phones = [company.phone, company.phoneSecondary].filter(
    (p): p is string => typeof p === "string" && p.length > 0 && !/700.?000.?000/.test(p)
  );
  return phones.join(" / ") || "+256 757 148631 / +256 754 604928";
}

type HeaderCompany = Pick<
  CompanyProfile,
  "name" | "tagline" | "phone" | "phoneSecondary" | "address" | "logoUrl"
>;

/** Logo left, company name right — shared thermal receipt header. */
export function ThermalReceiptHeader({
  company,
  children,
}: {
  company: HeaderCompany;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 mb-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={companyLogoUrl(company.logoUrl)}
          alt={company.name}
          className="h-[4.25rem] w-[4.25rem] shrink-0 object-contain"
        />
        <div className="flex-1 min-w-0 text-right">
          <p className="font-bold text-[9px] leading-tight uppercase tracking-wide">
            {company.name}
          </p>
          {company.tagline ? (
            <p className="text-gray-500 text-[7px] leading-tight mt-0.5">{company.tagline}</p>
          ) : null}
        </div>
      </div>
      <div className="text-center text-gray-600 text-[7px] leading-[1.1] mt-0.5 pt-0">
        {company.address ? <p>{company.address}</p> : null}
        <p>{companyPhones(company)}</p>
      </div>
      {children}
    </div>
  );
}

/** Split row — label left (logo column), value right (like company header). */
function ThermalSplitRow({
  left,
  leftClass = "font-bold text-[9px] leading-tight uppercase tracking-wide",
  right,
  subRight,
  rightClass = "font-bold text-[9px] leading-tight",
  subClass = "text-gray-500 text-[7px] leading-tight mt-0.5",
}: {
  left: string;
  leftClass?: string;
  right: string;
  subRight?: string;
  rightClass?: string;
  subClass?: string;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="w-[4.25rem] shrink-0">
        <p className={leftClass}>{left}</p>
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className={rightClass}>{right}</p>
        {subRight ? <p className={subClass}>{subRight}</p> : null}
      </div>
    </div>
  );
}

export type ThermalReceiptDetailRow = { label: string; value: string };

/** Receipt header + customer/payment rows — same layout as logo / company name. */
export function ThermalReceiptInfo({
  title,
  reference,
  dateLine,
  rows = [],
}: {
  title: string;
  reference: string;
  dateLine: string;
  rows?: ThermalReceiptDetailRow[];
}) {
  return (
    <div className="border-t border-dashed border-gray-400 mt-1 pt-1 space-y-1">
      <ThermalSplitRow left={title} right={reference} subRight={dateLine} />
      {rows.map((row) => (
        <ThermalSplitRow
          key={row.label}
          left={row.label}
          leftClass="text-[7px] leading-tight text-gray-600"
          right={row.value}
          rightClass="font-semibold text-[7px] leading-tight text-gray-900"
        />
      ))}
    </div>
  );
}
