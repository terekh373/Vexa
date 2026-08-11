-- Required by the trigram index on courses.title (autocomplete).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'AUTHOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('COURSE', 'MATERIAL');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'MODERATION', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'FILE', 'QUIZ');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('COVER', 'AVATAR', 'VIDEO', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('S3', 'CLOUDFLARE_STREAM');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('PURCHASE', 'ADMIN_GRANT', 'FREE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('LIQPAY', 'WAYFORPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "BalanceEntryType" AS ENUM ('SALE', 'REFUND', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('CARD', 'IBAN');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ComplaintTargetType" AS ENUM ('COURSE', 'REVIEW', 'USER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT', 'PURCHASE', 'MODERATION', 'PAYOUT', 'REVIEW', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(160) NOT NULL,
    "roles" "UserRole"[] DEFAULT ARRAY['STUDENT']::"UserRole"[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(5) NOT NULL DEFAULT 'uk',
    "google_id" VARCHAR(64),
    "email_verified_at" TIMESTAMPTZ(6),
    "avatar_file_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "headline" VARCHAR(255),
    "bio" TEXT,
    "website_url" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "commission_rate_bps" INTEGER,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "students_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "author_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "slug" VARCHAR(120) NOT NULL,
    "name_uk" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120),
    "icon_key" VARCHAR(64),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "name_uk" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "curriculum_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "grade" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "curriculum_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_topics" (
    "course_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_topics_pkey" PRIMARY KEY ("course_id","topic_id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "uploaded_by_id" UUID,
    "kind" "FileKind" NOT NULL,
    "provider" "StorageProvider" NOT NULL DEFAULT 'S3',
    "storage_key" VARCHAR(512) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(127) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "duration_sec" INTEGER,
    "is_ready" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "cover_file_id" UUID,
    "type" "ContentType" NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" VARCHAR(180) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "short_description" VARCHAR(400) NOT NULL,
    "description" TEXT NOT NULL,
    "outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" VARCHAR(5) NOT NULL DEFAULT 'uk',
    "grade" INTEGER,
    "price_amount" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH',
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "students_count" INTEGER NOT NULL DEFAULT 0,
    "lessons_count" INTEGER NOT NULL DEFAULT 0,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "type" "LessonType" NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_free_preview" BOOLEAN NOT NULL DEFAULT false,
    "text_content" TEXT,
    "video_file_id" UUID,
    "duration_sec" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lesson_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "pass_score" INTEGER NOT NULL DEFAULT 60,
    "time_limit_sec" INTEGER,
    "attempts_allowed" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE',
    "text" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "answer_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "max_score" INTEGER NOT NULL DEFAULT 0,
    "is_passed" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_option_ids" UUID[],
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "order_item_id" UUID,
    "source" "EnrollmentSource" NOT NULL DEFAULT 'PURCHASE',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "last_lesson_id" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH',
    "paid_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title_snapshot" VARCHAR(180) NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "commission_rate_bps" INTEGER NOT NULL,
    "commission_amount" INTEGER NOT NULL,
    "author_amount" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_id" VARCHAR(128),
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH',
    "payload" JSONB,
    "failure_reason" VARCHAR(255),
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "external_id" VARCHAR(191) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ(6),
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "available_amount" INTEGER NOT NULL DEFAULT 0,
    "pending_amount" INTEGER NOT NULL DEFAULT 0,
    "withdrawn_amount" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "BalanceEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "order_item_id" UUID,
    "payout_id" UUID,
    "comment" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "balance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH',
    "method" "PayoutMethod" NOT NULL,
    "destination_masked" VARCHAR(64) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "comment" VARCHAR(255),
    "processed_by_id" UUID,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "author_reply" TEXT,
    "author_replied_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "target_type" "ComplaintTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "comment" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "moderator_id" UUID,
    "action" "ModerationAction" NOT NULL,
    "from_status" "CourseStatus" NOT NULL,
    "to_status" "CourseStatus" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "author_profiles_user_id_key" ON "author_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_subjects_slug_key" ON "curriculum_subjects"("slug");

-- CreateIndex
CREATE INDEX "curriculum_topics_subject_id_grade_idx" ON "curriculum_topics"("subject_id", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_topics_subject_id_grade_title_key" ON "curriculum_topics"("subject_id", "grade", "title");

-- CreateIndex
CREATE INDEX "course_topics_topic_id_idx" ON "course_topics"("topic_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_id_idx" ON "files"("uploaded_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_status_category_id_idx" ON "courses"("status", "category_id");

-- CreateIndex
CREATE INDEX "courses_status_published_at_idx" ON "courses"("status", "published_at");

-- CreateIndex
CREATE INDEX "courses_author_id_status_idx" ON "courses"("author_id", "status");

-- CreateIndex
CREATE INDEX "courses_type_status_idx" ON "courses"("type", "status");

-- CreateIndex
CREATE INDEX "courses_title_trgm_idx" ON "courses" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "modules_course_id_sort_order_idx" ON "modules"("course_id", "sort_order");

-- CreateIndex
CREATE INDEX "lessons_module_id_sort_order_idx" ON "lessons"("module_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_files_lesson_id_file_id_key" ON "lesson_files"("lesson_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_files_course_id_file_id_key" ON "course_files"("course_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_lesson_id_key" ON "quizzes"("lesson_id");

-- CreateIndex
CREATE INDEX "questions_quiz_id_sort_order_idx" ON "questions"("quiz_id", "sort_order");

-- CreateIndex
CREATE INDEX "answer_options_question_id_sort_order_idx" ON "answer_options"("question_id", "sort_order");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_user_id_idx" ON "quiz_attempts"("quiz_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempt_answers_attempt_id_question_id_key" ON "quiz_attempt_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_order_item_id_key" ON "enrollments"("order_item_id");

-- CreateIndex
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_course_id_key" ON "enrollments"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_enrollment_id_lesson_id_key" ON "lesson_progress"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_course_id_key" ON "cart_items"("cart_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE INDEX "orders_user_id_status_idx" ON "orders"("user_id", "status");

-- CreateIndex
CREATE INDEX "order_items_author_id_idx" ON "order_items"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_course_id_key" ON "order_items"("order_id", "course_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_external_id_key" ON "payment_webhook_events"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "balances_user_id_key" ON "balances"("user_id");

-- CreateIndex
CREATE INDEX "balance_entries_user_id_created_at_idx" ON "balance_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payouts_author_id_status_idx" ON "payouts"("author_id", "status");

-- CreateIndex
CREATE INDEX "reviews_course_id_status_idx" ON "reviews"("course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_course_id_user_id_key" ON "reviews"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "complaints_status_target_type_idx" ON "complaints"("status", "target_type");

-- CreateIndex
CREATE INDEX "complaints_target_type_target_id_idx" ON "complaints"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_log_course_id_created_at_idx" ON "moderation_log"("course_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_profiles" ADD CONSTRAINT "author_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_topics" ADD CONSTRAINT "curriculum_topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "curriculum_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "curriculum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_cover_file_id_fkey" FOREIGN KEY ("cover_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_video_file_id_fkey" FOREIGN KEY ("video_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_files" ADD CONSTRAINT "course_files_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_files" ADD CONSTRAINT "course_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_entries" ADD CONSTRAINT "balance_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
