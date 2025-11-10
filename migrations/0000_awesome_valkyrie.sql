CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_api_id" varchar(255) NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"guest_api_id" varchar(255) NOT NULL,
	"approval_status" varchar(50) NOT NULL,
	"registered_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" serial NOT NULL,
	"person_id" serial NOT NULL,
	"ticket_type_id" varchar(255),
	"ticket_type_name" varchar(255),
	"ticket_amount" integer,
	CONSTRAINT "attendance_guest_api_id_unique" UNIQUE("guest_api_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"icon" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "board_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" serial NOT NULL,
	"position" varchar(255) NOT NULL,
	"term" json,
	"is_founder" boolean DEFAULT false NOT NULL,
	"display_order" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cache_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cache_metadata_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"website" varchar(255),
	"logo_url" varchar(255),
	"address" text,
	"phone_number" varchar(50),
	"email" varchar(255),
	"industry" varchar(100),
	"size" varchar(50),
	"founded" varchar(50),
	"featured_image_url" varchar(255),
	"bio" text,
	"is_phone_public" boolean DEFAULT false NOT NULL,
	"is_email_public" boolean DEFAULT false NOT NULL,
	"cta_text" varchar(255),
	"custom_links" json DEFAULT '[]'::json,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"industry_id" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"user_id" serial NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"title" varchar(255),
	"is_public" boolean DEFAULT true NOT NULL,
	"added_by" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" serial NOT NULL,
	"tag_id" serial NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"emails_sent_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp with time zone,
	"next_send_at" timestamp with time zone,
	"opted_out" boolean DEFAULT false NOT NULL,
	"final_message_sent" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvp_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_api_id" varchar(255) NOT NULL,
	"event_api_id" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"cover_url" varchar(255),
	"url" varchar(255),
	"timezone" varchar(50),
	"location" json,
	"visibility" varchar(50),
	"meeting_url" varchar(255),
	"calendar_api_id" varchar(255),
	"last_attendance_sync" timestamp with time zone,
	"created_at" timestamp with time zone,
	"grants_premium_access" boolean DEFAULT false,
	"premium_ticket_types" json DEFAULT '[]'::json,
	"premium_expires_at" timestamp with time zone,
	CONSTRAINT "events_api_id_unique" UNIQUE("api_id")
);
--> statement-breakpoint
CREATE TABLE "founding_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" serial NOT NULL,
	"contribution_area" varchar(255),
	"display_order" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_name" varchar(255),
	"full_name" varchar(255),
	"avatar_url" varchar(255),
	"role" varchar(50),
	"phone_number" varchar(50),
	"bio" text,
	"created_at" timestamp with time zone,
	"stats" json DEFAULT '{"totalEventsAttended":0,"lastEventDate":null,"firstEventDate":null,"lastUpdated":"2025-11-10T15:09:54.346Z"}'::json,
	CONSTRAINT "people_api_id_unique" UNIQUE("api_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" serial NOT NULL,
	"tag_id" serial NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"featured_image" varchar(255),
	"video_url" varchar(255),
	"cta_link" varchar(255),
	"cta_label" varchar(255),
	"is_pinned" boolean DEFAULT false NOT NULL,
	"members_only" boolean DEFAULT false NOT NULL,
	"creator_id" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" serial NOT NULL,
	"permission_id" serial NOT NULL,
	"granted_by" serial NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"tier" varchar(50) NOT NULL,
	"logo" varchar(255) NOT NULL,
	"url" varchar(255),
	"year" integer NOT NULL,
	"company_id" integer,
	"deleted_at" timestamp with time zone,
	"deleted_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_text_unique" UNIQUE("text")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" serial NOT NULL,
	"quote" text NOT NULL,
	"position" varchar(255),
	"company" varchar(255),
	"display_order" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" varchar(255),
	"display_order" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"role_id" serial NOT NULL,
	"granted_by" serial NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"password" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"person_id" serial NOT NULL,
	"stripe_customer_id" varchar(255),
	"subscription_status" varchar(50) DEFAULT 'inactive',
	"subscription_id" varchar(255),
	"premium_source" varchar(50),
	"premium_expires_at" timestamp with time zone,
	"premium_granted_by" integer,
	"premium_granted_at" timestamp with time zone,
	"luma_ticket_id" varchar(255),
	"featured_image_url" varchar(255),
	"bio" text,
	"company_name" varchar(255),
	"company_description" text,
	"address" text,
	"phone_number" varchar(50),
	"is_phone_public" boolean DEFAULT false NOT NULL,
	"is_email_public" boolean DEFAULT false NOT NULL,
	"cta_text" varchar(255),
	"custom_links" json DEFAULT '[]'::json,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_industries" ADD CONSTRAINT "company_industries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_industries" ADD CONSTRAINT "company_industries_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_tags" ADD CONSTRAINT "company_tags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_tags" ADD CONSTRAINT "company_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_invitations" ADD CONSTRAINT "email_invitations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founding_members" ADD CONSTRAINT "founding_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_industry_name_idx" ON "companies" USING btree ("industry","name");--> statement-breakpoint
CREATE INDEX "sponsors_active_idx" ON "sponsors" USING btree ("company_id","year") WHERE "sponsors"."deleted_at" IS NULL;