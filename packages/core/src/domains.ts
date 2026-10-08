/** Business domains of the glossary (plan §1.1). The key is the stable identifier. */
export interface DomainDef {
  key: string;
  order: number;
  name: { lv: string; en: string };
  description: { lv: string; en: string };
}

export const DOMAINS: readonly DomainDef[] = [
  {
    key: "party",
    order: 1,
    name: { lv: "Klienti un personas", en: "Party & Customer" },
    description: {
      lv: "Apdrošinājuma ņēmēji, apdrošinātie, labuma guvēji un klientu segmentācija.",
      en: "Policyholders, insured persons, beneficiaries and customer segmentation.",
    },
  },
  {
    key: "product",
    order: 2,
    name: { lv: "Produkti un segumi", en: "Product & Coverage" },
    description: {
      lv: "Apdrošināšanas veidi, produkti, segumi, riski, limiti un pašrisks.",
      en: "Lines of business, products, coverages, perils, limits and deductibles.",
    },
  },
  {
    key: "distribution",
    order: 3,
    name: { lv: "Izplatīšana un pārdošana", en: "Distribution & Sales" },
    description: {
      lv: "Pārdošanas kanāli, starpnieki, komisijas un piedāvājumi.",
      en: "Sales channels, intermediaries, commissions and quotes.",
    },
  },
  {
    key: "policy",
    order: 4,
    name: { lv: "Polises un parakstīšana", en: "Policy & Underwriting" },
    description: {
      lv: "Polises dzīves cikls, grozījumi, atjaunošana, izbeigšana un riska novērtēšana.",
      en: "Policy lifecycle, endorsements, renewals, cancellations and risk assessment.",
    },
  },
  {
    key: "premium",
    order: 5,
    name: { lv: "Prēmijas un norēķini", en: "Premium & Billing" },
    description: {
      lv: "Parakstītās, nopelnītās un nenopelnītās prēmijas, maksājumi un debitori.",
      en: "Written, earned and unearned premium, instalments and receivables.",
    },
  },
  {
    key: "claims",
    order: 6,
    name: { lv: "Atlīdzības", en: "Claims" },
    description: {
      lv: "Zaudējumu pieteikumi, regulēšana, izmaksas, rezerves un regresi.",
      en: "Loss notifications, claims handling, payments, reserves and recoveries.",
    },
  },
  {
    key: "reinsurance",
    order: 7,
    name: { lv: "Pārapdrošināšana", en: "Reinsurance" },
    description: {
      lv: "Pārapdrošināšanas līgumi, nodotās prēmijas, pašieturējums un atgūtās summas.",
      en: "Reinsurance treaties, ceded premium, retention and recoveries.",
    },
  },
  {
    key: "actuarial",
    order: 8,
    name: { lv: "Aktuārie aprēķini un rezerves", en: "Actuarial & Reserving" },
    description: {
      lv: "Zaudējumu attīstības trijstūri, IBNR, galīgie zaudējumi un rezervju pietiekamība.",
      en: "Loss development triangles, IBNR, ultimate losses and reserve adequacy.",
    },
  },
  {
    key: "finance",
    order: 9,
    name: { lv: "Finanses un 17. SFPS", en: "Finance & IFRS 17" },
    description: {
      lv: "Rentabilitātes rādītāji, izdevumi un apdrošināšanas līgumu uzskaite saskaņā ar 17. SFPS.",
      en: "Profitability measures, expenses and insurance contract accounting under IFRS 17.",
    },
  },
  {
    key: "risk-capital",
    order: 10,
    name: { lv: "Risks un kapitāls – Maksātspēja II", en: "Risk & Capital – Solvency II" },
    description: {
      lv: "Kapitāla prasības, pašu līdzekļi, tehniskās rezerves un uzraudzības pārskati.",
      en: "Capital requirements, own funds, technical provisions and supervisory reporting.",
    },
  },
  {
    key: "investments",
    order: 11,
    name: { lv: "Ieguldījumi", en: "Investments" },
    description: {
      lv: "Ieguldījumu portfelis, ienākumi un ienesīgums.",
      en: "Investment portfolio, income and yield.",
    },
  },
  {
    key: "service-operations",
    order: 12,
    name: { lv: "Klientu apkalpošana un darbība", en: "Customer Service & Operations" },
    description: {
      lv: "Sūdzības, apkalpošanas līmeņi, klientu apmierinātība un procesu efektivitāte.",
      en: "Complaints, service levels, customer satisfaction and process efficiency.",
    },
  },
  {
    key: "compliance",
    order: 13,
    name: { lv: "Regulējums un atbilstība", en: "Regulatory & Compliance" },
    description: {
      lv: "Normatīvās prasības, uzraudzība un obligātās apdrošināšanas regulējums.",
      en: "Regulatory requirements, supervision and compulsory insurance rules.",
    },
  },
  {
    key: "reference-data",
    order: 14,
    name: { lv: "Atsauces dati un klasifikatori", en: "Reference data & code lists" },
    description: {
      lv: "Kopīgi klasifikatori: apdrošināšanas veidi, valūtas, valstis, zaudējumu cēloņi.",
      en: "Shared code lists: lines of business, currencies, countries, causes of loss.",
    },
  },
];

export const DOMAIN_KEYS = DOMAINS.map((d) => d.key);
