CREATE TABLE "MenuItem" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "pricePesewas" INTEGER,
  "variants" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteConfig" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "restaurantName" TEXT NOT NULL DEFAULT 'Titanic City Ventures',
  "tagline" TEXT NOT NULL DEFAULT 'A Place to Be!',
  "heroTitle" TEXT NOT NULL DEFAULT 'Accra''s table, turned all the way up.',
  "heroSubtitle" TEXT NOT NULL DEFAULT 'Bold Ghanaian favourites, grills, rice dishes and more — ordered online and delivered across our Accra service area.',
  "phone" TEXT NOT NULL DEFAULT '',
  "whatsapp" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "restaurantLat" DOUBLE PRECISION,
  "restaurantLng" DOUBLE PRECISION,
  "deliveryBaseFeePesewas" INTEGER,
  "deliveryPerKmPesewas" INTEGER,
  "deliveryMinimumFeePesewas" INTEGER,
  "maxDeliveryKm" DOUBLE PRECISION DEFAULT 25,
  "serviceMinLat" DOUBLE PRECISION NOT NULL DEFAULT 5.45,
  "serviceMaxLat" DOUBLE PRECISION NOT NULL DEFAULT 5.75,
  "serviceMinLng" DOUBLE PRECISION NOT NULL DEFAULT -0.35,
  "serviceMaxLng" DOUBLE PRECISION NOT NULL DEFAULT -0.05,
  "ordersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryLat" DOUBLE PRECISION NOT NULL,
  "deliveryLng" DOUBLE PRECISION NOT NULL,
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "deliveryFeePesewas" INTEGER NOT NULL,
  "subtotalPesewas" INTEGER NOT NULL,
  "totalPesewas" INTEGER NOT NULL,
  "items" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "paystackReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MenuItem_slug_key" ON "MenuItem"("slug");
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
CREATE UNIQUE INDEX "Order_paystackReference_key" ON "Order"("paystackReference");
