ALTER TABLE "SiteConfig"
  ADD COLUMN "restaurantPlaceId" TEXT NOT NULL DEFAULT 'ChIJE7EZ2K-H3w8R8efP8YXbK-w',
  ADD COLUMN "deliveryPerMinutePesewas" INTEGER DEFAULT 10,
  ADD COLUMN "deliveryTrafficWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
  ADD COLUMN "deliveryTrafficCap" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
  ADD COLUMN "deliverySurgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN "deliveryRoundToPesewas" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "SiteConfig" ALTER COLUMN "phone" SET DEFAULT '+233 54 324 5511';
ALTER TABLE "SiteConfig" ALTER COLUMN "address" SET DEFAULT 'Titanic Beach, Tema, Ghana';
ALTER TABLE "SiteConfig" ALTER COLUMN "deliveryBaseFeePesewas" SET DEFAULT 400;
ALTER TABLE "SiteConfig" ALTER COLUMN "deliveryPerKmPesewas" SET DEFAULT 150;
ALTER TABLE "SiteConfig" ALTER COLUMN "deliveryMinimumFeePesewas" SET DEFAULT 1000;

UPDATE "SiteConfig"
SET
  "phone" = CASE WHEN BTRIM("phone") = '' THEN '+233 54 324 5511' ELSE "phone" END,
  "address" = CASE WHEN BTRIM("address") = '' THEN 'Titanic Beach, Tema, Ghana' ELSE "address" END,
  "restaurantPlaceId" = CASE WHEN BTRIM("restaurantPlaceId") = '' THEN 'ChIJE7EZ2K-H3w8R8efP8YXbK-w' ELSE "restaurantPlaceId" END,
  "deliveryBaseFeePesewas" = COALESCE("deliveryBaseFeePesewas", 400),
  "deliveryPerKmPesewas" = COALESCE("deliveryPerKmPesewas", 150),
  "deliveryPerMinutePesewas" = COALESCE("deliveryPerMinutePesewas", 10),
  "deliveryMinimumFeePesewas" = COALESCE("deliveryMinimumFeePesewas", 1000);

ALTER TABLE "Order"
  ADD COLUMN "deliveryDurationMinutes" DOUBLE PRECISION,
  ADD COLUMN "deliveryPricingMultiplier" DOUBLE PRECISION;
