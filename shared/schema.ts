import { pgTable, text, serial, timestamp, varchar, json, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add validation for phone numbers
export const phoneRegex = /^\+?[0-9\-\s()]+$/;

// Update the userCustomLink schema with better URL validation
export const userCustomLink = z.object({
  title: z.string().min(1, "Link title is required"),
  url: z.string().url("Must be a valid URL").min(1, "URL is required"),
  icon: z.string().optional(),
});

export type UserCustomLink = z.infer<typeof userCustomLink>;

export const cacheMetadata = pgTable("cache_metadata", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  api_id: varchar("api_id", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { mode: 'string', withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { mode: 'string', withTimezone: true }).notNull(),
  coverUrl: varchar("cover_url", { length: 255 }),
  url: varchar("url", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }),
  location: json("location").$type<{
    city?: string;
    region?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    full_address?: string;
  }>(),
  visibility: varchar("visibility", { length: 50 }),
  meetingUrl: varchar("meeting_url", { length: 255 }),
  calendarApiId: varchar("calendar_api_id", { length: 255 }),
  lastAttendanceSync: timestamp("last_attendance_sync", { mode: 'string', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  api_id: varchar("api_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  role: varchar("role", { length: 50 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  bio: text("bio"),
  organizationName: varchar("organization_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }),
  stats: json("stats").$type<{
    totalEventsAttended: number;
    lastEventDate: string | null;
    firstEventDate: string | null;
    averageEventsPerYear?: number;
    lastUpdated: string;
  }>().default({
    totalEventsAttended: 0,
    lastEventDate: null,
    firstEventDate: null,
    lastUpdated: new Date().toISOString()
  }),
});

// Update users table with new fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  password: varchar("password", { length: 255 }),
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  personId: serial("person_id").references(() => people.id),
  // Stripe related fields
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default('inactive'),
  subscriptionId: varchar("subscription_id", { length: 255 }),
  featuredImageUrl: varchar("featured_image_url", { length: 255 }),
  bio: text("bio"),
  companyName: varchar("company_name", { length: 255 }),
  companyDescription: text("company_description"),
  address: text("address"),
  phoneNumber: varchar("phone_number", { length: 50 }),
  isPhonePublic: boolean("is_phone_public").notNull().default(false),
  isEmailPublic: boolean("is_email_public").notNull().default(false),
  ctaText: varchar("cta_text", { length: 255 }),
  customLinks: json("custom_links").$type<UserCustomLink[]>().default([]),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string', withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const eventRsvpStatus = pgTable("event_rsvp_status", {
  id: serial("id").primaryKey(),
  userApiId: varchar("user_api_id", { length: 255 }).notNull(),
  eventApiId: varchar("event_api_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventApiId: varchar("event_api_id", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  guestApiId: varchar("guest_api_id", { length: 255 }).notNull().unique(),
  approvalStatus: varchar("approval_status", { length: 50 }).notNull(),
  registeredAt: timestamp("registered_at", { mode: 'string', withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  userId: serial("user_id").references(() => users.id),
  personId: serial("person_id").references(() => people.id),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  text: varchar("text", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Add membersOnly field to posts table definition
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  body: text("body").notNull(),
  featuredImage: varchar("featured_image", { length: 255 }),
  videoUrl: varchar("video_url", { length: 255 }),
  ctaLink: varchar("cta_link", { length: 255 }),
  ctaLabel: varchar("cta_label", { length: 255 }),
  isPinned: boolean("is_pinned").notNull().default(false),
  membersOnly: boolean("members_only").notNull().default(false),
  creatorId: serial("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const postTags = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: serial("post_id").references(() => posts.id).notNull(),
  tagId: serial("tag_id").references(() => tags.id).notNull(),
});

export const insertPostTagSchema = createInsertSchema(postTags).omit({
  id: true,
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  resource: varchar("resource", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  roleId: serial("role_id").references(() => roles.id).notNull(),
  grantedBy: serial("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: serial("role_id").references(() => roles.id).notNull(),
  permissionId: serial("permission_id").references(() => permissions.id).notNull(),
  grantedBy: serial("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  icon: varchar("icon", { length: 255 }).notNull(),
  description: text("description").notNull(),
  isAutomatic: boolean("is_automatic").notNull().default(false),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Update the userBadges table schema to fix the serial fields
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  assignedBy: integer("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true
}).transform((data) => ({
  ...data,
  text: data.text.toLowerCase()
}));

// Update insert schema
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  creatorId: true
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type Post = typeof posts.$inferSelect & {
  creator?: {
    id: number;
    displayName: string | null;
  };
  tags?: string[];
};
export type InsertPost = z.infer<typeof insertPostSchema>;

export type PostTag = typeof postTags.$inferSelect;
export type InsertPostTag = z.infer<typeof insertPostTagSchema>;

export const insertEventSchema = createInsertSchema(events);
export const insertPersonSchema = createInsertSchema(people);
export const insertCacheMetadataSchema = createInsertSchema(cacheMetadata).omit({ id: true, updatedAt: true });
// Update the User type
export type User = typeof users.$inferSelect & {
  api_id?: string;
  roles?: Role[];
  permissions?: Permission[];
  badges?: Badge[];
};
// Update insert schema
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  isAdmin: true
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({ id: true, createdAt: true });
export const insertEventRsvpStatusSchema = createInsertSchema(eventRsvpStatus).omit({ id: true, updatedAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, lastSyncedAt: true });

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Person = typeof people.$inferSelect & {
  isAdmin?: boolean;
  user?: User | null;
};
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type CacheMetadata = typeof cacheMetadata.$inferSelect;
export type InsertCacheMetadata = z.infer<typeof insertCacheMetadataSchema>;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;
export type EventRsvpStatus = typeof eventRsvpStatus.$inferSelect;
export type InsertEventRsvpStatus = z.infer<typeof insertEventRsvpStatusSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export const updatePasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type UpdatePassword = z.infer<typeof updatePasswordSchema>;

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  grantedAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  grantedAt: true,
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  personId: serial("person_id").references(() => people.id).notNull(),
  quote: text("quote").notNull(),
  position: varchar("position", { length: 255 }),
  company: varchar("company", { length: 255 }),
  displayOrder: serial("display_order"),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { mode: 'string', withTimezone: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 255 }),
  displayOrder: serial("display_order"),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const boardMembers = pgTable("board_members", {
  id: serial("id").primaryKey(),
  personId: serial("person_id").references(() => people.id).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  term: json("term").$type<{
    start: string;
    end?: string;
  }>(),
  isFounder: boolean("is_founder").notNull().default(false),
  displayOrder: serial("display_order"),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const foundingMembers = pgTable("founding_members", {
  id: serial("id").primaryKey(),
  personId: serial("person_id").references(() => people.id).notNull(),
  contributionArea: varchar("contribution_area", { length: 255 }),
  displayOrder: serial("display_order"),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Industries for company classification
export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Many-to-many relationship between companies and industries
export const companyIndustries = pgTable("company_industries", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").references(() => companies.id).notNull(),
  industryId: serial("industry_id").references(() => industries.id).notNull(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  displayOrder: true,
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({
  id: true,
  createdAt: true,
  displayOrder: true,
});

export const insertBoardMemberSchema = createInsertSchema(boardMembers).omit({
  id: true,
  createdAt: true,
  displayOrder: true,
});

export const insertFoundingMemberSchema = createInsertSchema(foundingMembers).omit({
  id: true,
  createdAt: true,
  displayOrder: true,
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;

export type BoardMember = typeof boardMembers.$inferSelect;
export type InsertBoardMember = z.infer<typeof insertBoardMemberSchema>;

export type FoundingMember = typeof foundingMembers.$inferSelect;
export type InsertFoundingMember = z.infer<typeof insertFoundingMemberSchema>;

// Add type for location data
export const locationSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  placeId: z.string().optional(),
  formatted_address: z.string().optional(),
});

export type Location = z.infer<typeof locationSchema>;

// Update user profile schema with enhanced validation
// Update the updateUserProfileSchema with character limit
export const updateUserProfileSchema = z.object({
  displayName: z.string()
    .min(1, "Display name is required")
    .transform(val => val?.trim() || val),
  featuredImageUrl: z.string()
    .nullable()
    .transform(val => (!val || val === "" ? null : val))
    .optional(),
  bio: z.string()
    .nullable()
    .transform(val => (!val || val === "" ? null : val))
    .pipe(
      z.string()
        .max(140, "Bio must not exceed 140 characters")
        .nullable()
        .optional()
    ),
  companyName: z.string()
    .nullable()
    .transform(val => (!val || val === "" ? null : val))
    .optional(),
  companyDescription: z.string()
    .nullable()
    .transform(val => (!val || val === "" ? null : val))
    .optional(),
  address: z.union([
    locationSchema,
    z.string(),
    z.null(),
  ])
  .nullable()
  .optional()
  .transform(val => (!val || val === "" ? null : val)),
  phoneNumber: z.string()
    .nullable()
    .transform(val => (!val || val === "" ? null : val))
    .pipe(
      z.string()
        .regex(/^\+?[0-9\-\s()]+$/, "Please enter a valid phone number with only numbers, spaces, hyphens, parentheses and optionally a + prefix")
        .nullable()
        .optional()
    ),
  isPhonePublic: z.boolean().default(false),
  isEmailPublic: z.boolean().default(false),
  ctaText: z.string()
    .nullable()
    .transform(val => (!val || val === "" ? null : val))
    .optional(),
  customLinks: z.array(userCustomLink)
    .max(5, "Maximum 5 custom links allowed")
    .default([])
    .optional(),
  tags: z.array(z.string()).default([]).optional()
});

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

// Add insert schemas for badges and user_badges
export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

// Update insert schema for user badges
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  assignedAt: true,
});

// Add types for badges and user_badges
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

// Company Schema - For business accounts
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }),  // URL-friendly version of the name
  description: text("description"),
  website: varchar("website", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 255 }),
  address: text("address"),
  phoneNumber: varchar("phone_number", { length: 50 }),
  email: varchar("email", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  size: varchar("size", { length: 50 }),
  founded: varchar("founded", { length: 50 }),
  featuredImageUrl: varchar("featured_image_url", { length: 255 }),
  bio: text("bio"),
  isPhonePublic: boolean("is_phone_public").notNull().default(false),
  isEmailPublic: boolean("is_email_public").notNull().default(false),
  ctaText: varchar("cta_text", { length: 255 }),
  customLinks: json("custom_links").$type<UserCustomLink[]>().default([]),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Company Members Junction Table - Connects users to companies with role information
export const companyMembers = pgTable("company_members", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").references(() => companies.id).notNull(),
  userId: serial("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default('user'), // 'admin' or 'user'
  title: varchar("title", { length: 255 }),
  isPublic: boolean("is_public").notNull().default(true),
  addedBy: serial("added_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// Company Tags Junction Table
export const companyTags = pgTable("company_tags", {
  id: serial("id").primaryKey(),
  companyId: serial("company_id").references(() => companies.id).notNull(),
  tagId: serial("tag_id").references(() => tags.id).notNull(),
});

// Add industry insert schema
export const insertIndustrySchema = createInsertSchema(industries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
});

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyMemberSchema = createInsertSchema(companyMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyTagSchema = createInsertSchema(companyTags).omit({
  id: true,
});

export const insertCompanyIndustrySchema = createInsertSchema(companyIndustries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type Industry = typeof industries.$inferSelect;
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type CompanyMember = typeof companyMembers.$inferSelect;
export type InsertCompanyMember = z.infer<typeof insertCompanyMemberSchema>;
export type CompanyTag = typeof companyTags.$inferSelect;
export type InsertCompanyTag = z.infer<typeof insertCompanyTagSchema>;
export type CompanyIndustry = typeof companyIndustries.$inferSelect;
export type InsertCompanyIndustry = z.infer<typeof insertCompanyIndustrySchema>;