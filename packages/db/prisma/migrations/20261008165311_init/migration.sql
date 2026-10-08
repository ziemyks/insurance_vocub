-- CreateEnum
CREATE TYPE "ConceptType" AS ENUM ('TERM', 'METRIC');

-- CreateEnum
CREATE TYPE "ConceptStatus" AS ENUM ('CANDIDATE', 'APPROVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ChangeKind" AS ENUM ('CREATE', 'UPDATE', 'DEPRECATE');

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ENDORSED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'CONTRIBUTOR', 'STEWARD', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('MANUAL', 'ENTRA', 'SEED');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('BROADER', 'RELATED', 'PART_OF', 'REPLACED_BY');

-- CreateEnum
CREATE TYPE "ComponentRole" AS ENUM ('NUMERATOR', 'DENOMINATOR', 'COMPONENT');

-- CreateEnum
CREATE TYPE "DataElementKind" AS ENUM ('SYNAPSE_TABLE', 'SYNAPSE_COLUMN', 'POWERBI_DATASET', 'POWERBI_MEASURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entraOid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "domainId" TEXT,
    "source" "AssignmentSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "nameLv" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionLv" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "ownerId" TEXT,
    "stewardId" TEXT,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ConceptType" NOT NULL,
    "status" "ConceptStatus" NOT NULL DEFAULT 'CANDIDATE',
    "domainId" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "preferredLv" TEXT NOT NULL,
    "preferredEn" TEXT NOT NULL,
    "labelText" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "conceptId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "additivity" TEXT NOT NULL,
    "polarity" TEXT NOT NULL,
    "reinsuranceBasis" TEXT NOT NULL,
    "premiumBasis" TEXT NOT NULL,
    "timeBasis" TEXT NOT NULL,
    "accountingBasis" TEXT NOT NULL,
    "refreshFrequency" TEXT,
    "powerBiDataset" TEXT,
    "powerBiMeasure" TEXT,
    "hasDax" BOOLEAN NOT NULL DEFAULT false,
    "hasReferenceSql" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("conceptId")
);

-- CreateTable
CREATE TABLE "ConceptRelation" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,

    CONSTRAINT "ConceptRelation_pkey" PRIMARY KEY ("fromId","toId","type")
);

-- CreateTable
CREATE TABLE "MetricComponent" (
    "metricId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "role" "ComponentRole" NOT NULL,

    CONSTRAINT "MetricComponent_pkey" PRIMARY KEY ("metricId","componentId","role")
);

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "doc" JSONB NOT NULL,
    "status" "ConceptStatus" NOT NULL,
    "note" TEXT,
    "changeRequestId" TEXT,
    "authorId" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "kind" "ChangeKind" NOT NULL,
    "status" "ChangeStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "conceptId" TEXT,
    "domainId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "baseRevision" INTEGER,
    "reason" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "decidedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "ChangeStatus" NOT NULL,
    "toStatus" "ChangeStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "conceptId" TEXT,
    "changeRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeList" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameLv" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionLv" TEXT,
    "descriptionEn" TEXT,
    "conceptSlug" TEXT,

    CONSTRAINT "CodeList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeValue" (
    "id" TEXT NOT NULL,
    "codeListId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelLv" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),

    CONSTRAINT "CodeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataElement" (
    "id" TEXT NOT NULL,
    "kind" "DataElementKind" NOT NULL,
    "system" TEXT NOT NULL,
    "qualifiedName" TEXT NOT NULL,
    "description" TEXT,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "DataElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptDataMapping" (
    "conceptId" TEXT NOT NULL,
    "dataElementId" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptDataMapping_pkey" PRIMARY KEY ("conceptId","dataElementId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_entraOid_key" ON "User"("entraOid");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_userId_role_domainId_key" ON "RoleAssignment"("userId", "role", "domainId");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_key_key" ON "Domain"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_slug_key" ON "Concept"("slug");

-- CreateIndex
CREATE INDEX "Concept_domainId_status_idx" ON "Concept"("domainId", "status");

-- CreateIndex
CREATE INDEX "Concept_preferredEn_idx" ON "Concept"("preferredEn");

-- CreateIndex
CREATE INDEX "Concept_reviewDueAt_idx" ON "Concept"("reviewDueAt");

-- CreateIndex
CREATE INDEX "Metric_accountingBasis_reinsuranceBasis_idx" ON "Metric"("accountingBasis", "reinsuranceBasis");

-- CreateIndex
CREATE INDEX "ConceptRelation_toId_idx" ON "ConceptRelation"("toId");

-- CreateIndex
CREATE INDEX "MetricComponent_componentId_idx" ON "MetricComponent"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "Revision_conceptId_number_key" ON "Revision"("conceptId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_number_key" ON "ChangeRequest"("number");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_domainId_idx" ON "ChangeRequest"("status", "domainId");

-- CreateIndex
CREATE INDEX "ChangeRequest_authorId_idx" ON "ChangeRequest"("authorId");

-- CreateIndex
CREATE INDEX "ChangeRequest_slug_idx" ON "ChangeRequest"("slug");

-- CreateIndex
CREATE INDEX "Comment_conceptId_idx" ON "Comment"("conceptId");

-- CreateIndex
CREATE INDEX "Comment_changeRequestId_idx" ON "Comment"("changeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeList_key_key" ON "CodeList"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CodeValue_codeListId_code_key" ON "CodeValue"("codeListId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "DataElement_qualifiedName_key" ON "DataElement"("qualifiedName");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_stewardId_fkey" FOREIGN KEY ("stewardId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelation" ADD CONSTRAINT "ConceptRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelation" ADD CONSTRAINT "ConceptRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricComponent" ADD CONSTRAINT "MetricComponent_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricComponent" ADD CONSTRAINT "MetricComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeValue" ADD CONSTRAINT "CodeValue_codeListId_fkey" FOREIGN KEY ("codeListId") REFERENCES "CodeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptDataMapping" ADD CONSTRAINT "ConceptDataMapping_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptDataMapping" ADD CONSTRAINT "ConceptDataMapping_dataElementId_fkey" FOREIGN KEY ("dataElementId") REFERENCES "DataElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fuzzy, diacritics-insensitive search (search text is normalised in the app, see core/normalize.ts)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Concept_labelText_trgm_idx" ON "Concept" USING GIN ("labelText" gin_trgm_ops);
CREATE INDEX "Concept_fullText_trgm_idx" ON "Concept" USING GIN ("fullText" gin_trgm_ops);

-- Revisions and the audit log are append-only (plan §2: full, immutable audit trail)
CREATE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Revision_append_only" BEFORE UPDATE OR DELETE ON "Revision"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER "AuditLog_append_only" BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
