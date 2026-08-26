import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const companies = [
  // HEALTH INSURANCE
  "Aditya Birla Health Insurance Company Limited",
  "Care Health Insurance Limited",
  "Galaxy Health Insurance Company Limited",
  "ManipalCigna Health Insurance Company Limited",
  "Niva Bupa Health Insurance Company Limited",
  "Star Health and Allied Insurance Company Limited",

  // GENERAL / MOTOR INSURANCE
  "Acko General Insurance Limited",
  "Bajaj General Insurance Limited",
  "Cholamandalam MS General Insurance Company Limited",
  "ECGC Limited",
  "Future Generali India Insurance Company Limited",
  "Go Digit General Insurance Limited",
  "HDFC ERGO General Insurance Company Limited",
  "ICICI Lombard General Insurance Company Limited",
  "IFFCO TOKIO General Insurance Company Limited",
  "Kshema General Insurance Limited",
  "Liberty General Insurance Limited",
  "Magma General Insurance Limited",
  "National Insurance Company Limited",
  "Navi General Insurance Limited",
  "New India Assurance Company Limited",
  "Oriental Insurance Company Limited",
  "Raheja QBE General Insurance Company Limited",
  "Reliance General Insurance Company Limited",
  "Royal Sundaram General Insurance Company Limited",
  "SBI General Insurance Company Limited",
  "Shriram General Insurance Company Limited",
  "Tata AIG General Insurance Company Limited",
  "United India Insurance Company Limited",
  "Universal Sompo General Insurance Company Limited",
  "Zuno General Insurance Limited",

  // LIFE INSURANCE
  "Aditya Birla Sun Life Insurance Company Limited",
  "Ageas Federal Life Insurance Company Limited",
  "Aviva Life Insurance Company India Limited",
  "Bajaj Life Insurance Limited",
  "Bandhan Life Insurance Limited",
  "Bharti AXA Life Insurance Company Limited",
  "Canara HSBC Life Insurance Company Limited",
  "CreditAccess Life Insurance Limited",
  "Edelweiss Life Insurance Company Limited",
  "Future Generali India Life Insurance Company Limited",
  "Go Digit Life Insurance Limited",
  "HDFC Life Insurance Company Limited",
  "ICICI Prudential Life Insurance Company Limited",
  "IndiaFirst Life Insurance Company Limited",
  "Kotak Mahindra Life Insurance Company Limited",
  "Life Insurance Corporation of India",
  "Max Life Insurance Company Limited",
  "PNB MetLife India Insurance Company Limited",
  "Pramerica Life Insurance Limited",
  "Reliance Nippon Life Insurance Company Limited",
  "Sahara India Life Insurance Company Limited",
  "SBI Life Insurance Company Limited",
  "Shriram Life Insurance Company Limited",
  "Star Union Dai-ichi Life Insurance Company Limited",
  "Tata AIA Life Insurance Company Limited",
];

async function main() {
  console.log("");
  console.log("==============================================");
  console.log(" INSURANCE COMPANY SEED STARTED");
  console.log("==============================================");
  console.log("");

  let added = 0;
  let existing = 0;

  for (const name of companies) {
    const company = await prisma.company.findFirst({
      where: {
        name,
      },
    });

    if (company) {
      if (!company.isActive) {
        await prisma.company.update({
          where: {
            id: company.id,
          },
          data: {
            isActive: true,
          },
        });

        console.log("Activated:", name);
      } else {
        console.log("Already exists:", name);
      }

      existing++;
    } else {
      await prisma.company.create({
        data: {
          name,
          isActive: true,
        },
      });

      console.log("Added:", name);
      added++;
    }
  }

  const totalCompanies = await prisma.company.count({
    where: {
      isActive: true,
    },
  });

  console.log("");
  console.log("==============================================");
  console.log(" INSURANCE COMPANY SEED COMPLETED");
  console.log("==============================================");
  console.log("");
  console.log("New companies added:", added);
  console.log("Already existing:", existing);
  console.log("Total active companies:", totalCompanies);
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("SEED ERROR:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });