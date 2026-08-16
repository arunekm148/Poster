-- Add customerId first as nullable
ALTER TABLE "Customer"
ADD COLUMN "customerId" TEXT;

-- Give customer IDs to all existing customers
-- Oldest customer becomes CUST-000001, next CUST-000002, etc.
WITH numbered_customers AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS row_number
    FROM "Customer"
)
UPDATE "Customer" AS c
SET "customerId" =
    'CUST-' || LPAD(n.row_number::TEXT, 6, '0')
FROM numbered_customers AS n
WHERE c."id" = n."id";

-- Now customerId can safely be required
ALTER TABLE "Customer"
ALTER COLUMN "customerId" SET NOT NULL;

-- Make every customerId unique
CREATE UNIQUE INDEX "Customer_customerId_key"
ON "Customer"("customerId");