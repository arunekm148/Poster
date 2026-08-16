const fs = require("fs");
const path = require("path");

const schemaPath = path.join(
  process.cwd(),
  "prisma",
  "schema.prisma"
);

if (!fs.existsSync(schemaPath)) {
  console.error("❌ prisma/schema.prisma was not found.");
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, "utf8");

const staffSchema = `

enum StaffRole {
  STAFF
  SUPERVISOR
}

model Staff {
  id             String    @id @default(cuid())
  userId         String
  staffCode      String
  name           String
  phone          String    @unique
  password       String

  whatsapp       String?
  email          String?

  staffRole      StaffRole @default(STAFF)
  designation    String?
  department     String?

  supervisorId   String?

  address        String?
  district       String?
  state          String?
  pincode        String?

  joiningDate    DateTime?
  notes          String?

  loginEnabled   Boolean   @default(true)
  isActive       Boolean   @default(true)

  inactiveReason String?
  inactiveAt     DateTime?

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  supervisor     Staff?    @relation("StaffSupervisor", fields: [supervisorId], references: [id])
  teamMembers    Staff[]   @relation("StaffSupervisor")

  attendance     StaffAttendance[]

  @@unique([userId, staffCode])
  @@index([userId])
  @@index([supervisorId])
  @@index([staffRole])
  @@index([isActive])
}

model StaffAttendance {
  id         String   @id @default(cuid())
  staffId    String
  userId     String

  date       DateTime
  checkIn    DateTime?
  checkOut   DateTime?

  status     String?
  notes      String?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  staff      Staff    @relation(fields: [staffId], references: [id], onDelete: Cascade)

  @@unique([staffId, date])
  @@index([staffId])
  @@index([userId])
  @@index([date])
}
`;

if (
  schema.includes("model Staff {") ||
  schema.includes("model StaffAttendance {") ||
  schema.includes("enum StaffRole {")
) {
  console.log(
    "⚠️ Staff schema already exists. Nothing was added."
  );
  process.exit(0);
}

schema = schema.trimEnd() + "\n" + staffSchema + "\n";

fs.writeFileSync(schemaPath, schema, "utf8");

console.log("✅ Staff schema added successfully.");
console.log("✅ File updated: prisma/schema.prisma");
console.log("");
console.log("NEXT:");
console.log("1. npx prisma format");
console.log("2. npx prisma validate");