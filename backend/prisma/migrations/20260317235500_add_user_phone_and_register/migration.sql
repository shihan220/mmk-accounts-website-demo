-- Add phone support for user authentication
ALTER TABLE "User"
ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
