import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/* -------------------------------------------------------------------------- */
/* DATABASE CONNECTION                                                        */
/* -------------------------------------------------------------------------- */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

/* -------------------------------------------------------------------------- */
/* PRISMA POSTGRES ADAPTER                                                    */
/* -------------------------------------------------------------------------- */

const adapter = new PrismaPg({
  connectionString,
});

/* -------------------------------------------------------------------------- */
/* PRISMA CLIENT                                                              */
/* -------------------------------------------------------------------------- */

const prisma = new PrismaClient({
  adapter,
});

/* -------------------------------------------------------------------------- */
/* EXPORT                                                                     */
/* -------------------------------------------------------------------------- */

export default prisma;