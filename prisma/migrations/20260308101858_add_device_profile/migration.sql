-- CreateTable
CREATE TABLE "device_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_identifier" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT 'New Device',
    "default_printer" VARCHAR(50) NOT NULL DEFAULT 'thermal',
    "default_scanner" VARCHAR(50) NOT NULL DEFAULT 'keyboard',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_profiles_device_identifier_key" ON "device_profiles"("device_identifier");

-- CreateIndex
CREATE INDEX "device_profiles_device_identifier_idx" ON "device_profiles"("device_identifier");
