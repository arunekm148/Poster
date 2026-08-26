import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("");
  console.log("================================================");
  console.log(" RESET DATABASE - KEEP ADMIN LOGIN ONLY");
  console.log("================================================");
  console.log("");

  /*
  |--------------------------------------------------------------------------
  | SAFETY CHECK
  |--------------------------------------------------------------------------
  | Do not delete anything unless at least one ADMIN account exists.
  |--------------------------------------------------------------------------
  */

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (admins.length === 0) {
    throw new Error(
      "STOPPED: No ADMIN account found. Nothing was deleted."
    );
  }

  console.log("ADMIN account(s) that will be kept:");
  console.table(admins);

  console.log("");
  console.log("Starting database cleanup...");
  console.log("");

  /*
  |--------------------------------------------------------------------------
  | CLEAR ALL APPLICATION DATA
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | - User table is NOT truncated.
  | - ADMIN users are kept.
  | - All AGENT users are deleted afterward.
  | - Prisma migrations are NOT touched.
  |
  |--------------------------------------------------------------------------
  */

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE

        "ExamBookmark",
        "ExamAttemptAnswer",
        "ExamAttempt",
        "ExamTestQuestion",
        "ExamTest",
        "ExamQuestionTranslation",
        "ExamQuestion",
        "ExamChapter",
        "ExamModule",
        "ExamLanguageLink",
        "ExamLanguage",
        "Exam",

        "StaffAttendance",
        "Staff",

        "WithdrawalRequest",
        "AgentBankAccount",
        "CreditTransaction",
        "AgentCreditAccount",

        "SupportMessage",
        "AdminAnnouncement",
        "PasswordResetOtp",

        "EmiFollowUp",
        "EmiInstallment",
        "RenewalFollowUp",
        "FollowUp",
        "Enquiry",

        "Policy",

        "MediaRating",
        "Download",
        "Media",

        "UserCompany",
        "Company",
        "Category",

        "Consultant",
        "SubAgent",
        "Customer",

        "PlatformSetting"

      RESTART IDENTITY CASCADE;
    `);

    /*
    |--------------------------------------------------------------------------
    | DELETE ALL NON-ADMIN USERS
    |--------------------------------------------------------------------------
    */

    const deletedUsers = await tx.user.deleteMany({
      where: {
        role: {
          not: "ADMIN",
        },
      },
    });

    console.log(
      `Deleted non-admin users: ${deletedUsers.count}`
    );
  });

  /*
  |--------------------------------------------------------------------------
  | VERIFY RESULT
  |--------------------------------------------------------------------------
  */

  const remainingUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    subAgents: await prisma.subAgent.count(),
    consultants: await prisma.consultant.count(),
    staff: await prisma.staff.count(),
    companies: await prisma.company.count(),
    categories: await prisma.category.count(),
    media: await prisma.media.count(),
    policies: await prisma.policy.count(),
    enquiries: await prisma.enquiry.count(),
    followUps: await prisma.followUp.count(),
    renewals: await prisma.renewalFollowUp.count(),
    exams: await prisma.exam.count(),
    withdrawals: await prisma.withdrawalRequest.count(),
    supportMessages: await prisma.supportMessage.count(),
  };

  console.log("");
  console.log("================================================");
  console.log(" DATABASE RESET COMPLETED");
  console.log("================================================");
  console.log("");

  console.log("Remaining login users:");
  console.table(remainingUsers);

  console.log("");
  console.log("Database counts after reset:");
  console.table(counts);

  console.log("");
  console.log("Expected result:");
  console.log("- ADMIN login remains");
  console.log("- Agents = deleted");
  console.log("- Customers = 0");
  console.log("- Staff = 0");
  console.log("- Sub-agents = 0");
  console.log("- Companies = 0");
  console.log("- Posters/media = 0");
  console.log("- Policies = 0");
  console.log("- Enquiries/follow-ups = 0");
  console.log("- Exam data = 0");
  console.log("- Wallet/withdrawal data = 0");
  console.log("- Support data = 0");
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("================================================");
    console.error(" RESET ERROR");
    console.error("================================================");
    console.error("");
    console.error(error);
    console.error("");

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });