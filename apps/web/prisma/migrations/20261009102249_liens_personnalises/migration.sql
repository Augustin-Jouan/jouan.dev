-- CreateEnum
CREATE TYPE "Angle" AS ENUM ('application', 'vitrine');

-- CreateEnum
CREATE TYPE "Appareil" AS ENUM ('mobile', 'ordinateur');

-- CreateTable
CREATE TABLE "Lien" (
    "id" TEXT NOT NULL,
    "jeton" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "angle" "Angle" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visite" (
    "id" TEXT NOT NULL,
    "lienId" TEXT NOT NULL,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appareil" "Appareil" NOT NULL,
    "numero" INTEGER NOT NULL,
    "mailEnvoye" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Visite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lien_jeton_key" ON "Lien"("jeton");

-- CreateIndex
CREATE INDEX "Visite_lienId_le_idx" ON "Visite"("lienId", "le");

-- AddForeignKey
ALTER TABLE "Visite" ADD CONSTRAINT "Visite_lienId_fkey" FOREIGN KEY ("lienId") REFERENCES "Lien"("id") ON DELETE CASCADE ON UPDATE CASCADE;
