-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'cashier', 'supervisor');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('pending', 'completed', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('in', 'out', 'return_item', 'damage', 'lost');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('bill', 'manual', 'adjustment');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('string', 'integer', 'boolean', 'json');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'cashier',
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" TIMESTAMP(3),
    "password_expires_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "two_factor_secret" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_backup_codes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plu_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "barcode" VARCHAR(100),
    "qr_code" VARCHAR(100),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "sell_quantity" INTEGER NOT NULL DEFAULT 0,
    "return_quantity" INTEGER NOT NULL DEFAULT 0,
    "damage_quantity" INTEGER NOT NULL DEFAULT 0,
    "lost_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_discount" BOOLEAN NOT NULL DEFAULT false,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID,
    "category_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bill_number" VARCHAR(50) NOT NULL,
    "customer_id" UUID,
    "customer_name" VARCHAR(255) NOT NULL DEFAULT 'Customer',
    "customer_email" VARCHAR(255),
    "staff_id" UUID NOT NULL,
    "staff_name" VARCHAR(255) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" "BillStatus" NOT NULL DEFAULT 'pending',
    "return_reason" TEXT,
    "return_authorized_by" UUID,
    "return_authorized_at" TIMESTAMP(3),
    "remarks" TEXT,
    "is_printed" BOOLEAN NOT NULL DEFAULT false,
    "is_email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bill_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "plu_code" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "actual_price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_type" "ReferenceType",
    "reference_id" UUID,
    "notes" TEXT,
    "movement_date" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "type" "SettingType" NOT NULL DEFAULT 'string',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "filename" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "backup_type" "BackupType" NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT NOT NULL DEFAULT '',
    "browser" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "os" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "device" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "city" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "country" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "region" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_blacklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" VARCHAR(255) NOT NULL DEFAULT 'logout',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT NOT NULL DEFAULT '',
    "details" TEXT,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'low',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "details" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_deleted_at_idx" ON "categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "items_plu_code_key" ON "items"("plu_code");

-- CreateIndex
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "items_qr_code_key" ON "items"("qr_code");

-- CreateIndex
CREATE INDEX "items_plu_code_idx" ON "items"("plu_code");

-- CreateIndex
CREATE INDEX "items_barcode_idx" ON "items"("barcode");

-- CreateIndex
CREATE INDEX "items_category_id_idx" ON "items"("category_id");

-- CreateIndex
CREATE INDEX "items_deleted_at_idx" ON "items"("deleted_at");

-- CreateIndex
CREATE INDEX "promotions_item_id_idx" ON "promotions"("item_id");

-- CreateIndex
CREATE INDEX "promotions_category_id_idx" ON "promotions"("category_id");

-- CreateIndex
CREATE INDEX "promotions_start_date_end_date_idx" ON "promotions"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "promotions_deleted_at_idx" ON "promotions"("deleted_at");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "bills_bill_number_key" ON "bills"("bill_number");

-- CreateIndex
CREATE INDEX "bills_bill_number_idx" ON "bills"("bill_number");

-- CreateIndex
CREATE INDEX "bills_customer_id_idx" ON "bills"("customer_id");

-- CreateIndex
CREATE INDEX "bills_staff_id_idx" ON "bills"("staff_id");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_created_at_idx" ON "bills"("created_at");

-- CreateIndex
CREATE INDEX "bills_deleted_at_idx" ON "bills"("deleted_at");

-- CreateIndex
CREATE INDEX "bill_items_bill_id_idx" ON "bill_items"("bill_id");

-- CreateIndex
CREATE INDEX "bill_items_item_id_idx" ON "bill_items"("item_id");

-- CreateIndex
CREATE INDEX "stock_movements_item_id_idx" ON "stock_movements"("item_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_movement_date_idx" ON "stock_movements"("movement_date");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_key_idx" ON "settings"("key");

-- CreateIndex
CREATE INDEX "backups_backup_type_idx" ON "backups"("backup_type");

-- CreateIndex
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "login_sessions_session_token_key" ON "login_sessions"("session_token");

-- CreateIndex
CREATE INDEX "login_sessions_user_id_is_active_idx" ON "login_sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "login_sessions_expires_at_idx" ON "login_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_token_hash_key" ON "token_blacklist"("token_hash");

-- CreateIndex
CREATE INDEX "token_blacklist_user_id_idx" ON "token_blacklist"("user_id");

-- CreateIndex
CREATE INDEX "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");

-- CreateIndex
CREATE INDEX "security_events_user_id_event_type_idx" ON "security_events"("user_id", "event_type");

-- CreateIndex
CREATE INDEX "security_events_created_at_idx" ON "security_events"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_return_authorized_by_fkey" FOREIGN KEY ("return_authorized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_blacklist" ADD CONSTRAINT "token_blacklist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
