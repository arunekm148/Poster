import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

type InsuranceCategory = "MOTOR" | "HEALTH" | "LIFE";

type SeedCompany = {
  name: string;
  categories: InsuranceCategory[];
};

const companies: SeedCompany[] = [
  // ============================================================
  // HEALTH INSURANCE COMPANIES
  // ============================================================

  {
    name: "Aditya Birla Health Insurance Company Limited",
    categories: ["HEALTH"],
  },
  {
    name: "Care Health Insurance Limited",
    categories: ["HEALTH"],
  },
  {
    name: "Manipal Cigna Health Insurance Company Limited",
    categories: ["HEALTH"],
  },
  {
    name: "Narayana Health Insurance Limited",
    categories: ["HEALTH"],
  },
  {
    name: "Niva Bupa Health Insurance Company Limited",
    categories: ["HEALTH"],
  },
  {
    name: "Star Health & Allied Insurance Company Limited",
    categories: ["HEALTH"],
  },

  // ============================================================
  // GENERAL INSURANCE - MOTOR + HEALTH
  // ============================================================

  {
    name: "Acko General Insurance Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Bajaj General Insurance Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Cholamandalam MS General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Generali Central Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Go Digit General Insurance Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "HDFC ERGO General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "ICICI Lombard General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "IFFCO Tokio General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Liberty General Insurance Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Magma General Insurance Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "National Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Raheja QBE General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Reliance General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Royal Sundaram General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "SBI General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Shriram General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Tata AIG General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "The New India Assurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "The Oriental Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "United India Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Universal Sompo General Insurance Company Limited",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Zurich Kotak General Insurance Company",
    categories: ["MOTOR", "HEALTH"],
  },
  {
    name: "Zuno General Insurance Limited",
    categories: ["MOTOR", "HEALTH"],
  },

  // ============================================================
  // LIFE INSURANCE COMPANIES
  // ============================================================

  {
    name: "Life Insurance Corporation of India",
    categories: ["LIFE"],
  },
  {
    name: "Axis Max Life Insurance Limited",
    categories: ["LIFE"],
  },
  {
    name: "HDFC Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "ICICI Prudential Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Kotak Mahindra Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Aditya Birla Sun Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Tata AIA Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "SBI Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Bajaj Life Insurance Limited",
    categories: ["LIFE"],
  },
  {
    name: "PNB MetLife India Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "IndusInd Nippon Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Canara HSBC Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Aviva Life Insurance Company India Limited",
    categories: ["LIFE"],
  },
  {
    name: "Ageas Federal Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Bandhan Life Insurance Limited",
    categories: ["LIFE"],
  },
  {
    name: "Edelweiss Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "IndiaFirst Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Pramerica Life Insurance Limited",
    categories: ["LIFE"],
  },
  {
    name: "Shriram Life Insurance Company Limited",
    categories: ["LIFE"],
  },
  {
    name: "Star Union Dai-ichi Life Insurance Company Limited",
    categories: ["LIFE"],
  },
];

async function main() {
  console.log("");
  console.log("==============================================");
  console.log(" INSURANCE COMPANY SAFE SEED STARTED");
  console.log("==============================================");
  console.log("");

  let added = 0;
  let updated = 0;
  let existingCount = 0;

  for (const item of companies) {
    const existing = await prisma.company.findFirst({
      where: {
        name: item.name,
      },
    });

    if (!existing) {
      await prisma.company.create({
        data: {
          name: item.name,
          categories: item.categories,
          isActive: true,
        },
      });

      added++;

      console.log(`ADDED   : ${item.name}`);
      continue;
    }

    const currentCategories = [...existing.categories].sort();
    const wantedCategories = [...item.categories].sort();

    const categoriesDifferent =
      JSON.stringify(currentCategories) !==
      JSON.stringify(wantedCategories);

    if (categoriesDifferent || !existing.isActive) {
      await prisma.company.update({
        where: {
          id: existing.id,
        },
        data: {
          categories: item.categories,
          isActive: true,

          // IMPORTANT:
          // logoUrl is intentionally NOT updated.
          // Existing uploaded logos remain untouched.
        },
      });

      updated++;

      console.log(`UPDATED : ${item.name}`);
    } else {
      existingCount++;

      console.log(`EXISTS  : ${item.name}`);
    }
  }

  const totalCompanies = await prisma.company.count();

  console.log("");
  console.log("==============================================");
  console.log(" INSURANCE COMPANY SAFE SEED COMPLETED");
  console.log("==============================================");
  console.log(`Added             : ${added}`);
  console.log(`Updated           : ${updated}`);
  console.log(`Already existing  : ${existingCount}`);
  console.log(`Total DB records  : ${totalCompanies}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("==============================================");
    console.error(" SEED ERROR");
    console.error("==============================================");
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });