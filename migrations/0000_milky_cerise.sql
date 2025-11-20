CREATE TYPE "public"."contact_type" AS ENUM('requester', 'staff', 'other');--> statement-breakpoint
CREATE TYPE "public"."equipment_category" AS ENUM('appliances', 'hvac', 'structure', 'plumbing', 'electric', 'landscaping', 'diagrams', 'other');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('job_note', 'recommendation');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('building', 'lawn', 'parking', 'recreation', 'utility', 'road', 'other');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'under_review', 'converted_to_task', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'approved', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('not_started', 'in_progress', 'completed', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('one_time', 'recurring', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'reserved', 'in_use', 'needs_cleaning', 'needs_maintenance', 'out_of_service');--> statement-breakpoint
CREATE TABLE "areas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"category" "equipment_category" NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"serial_number" varchar(200),
	"condition" varchar(100),
	"notes" text,
	"image_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" varchar(50),
	"location" varchar(200),
	"min_quantity" integer DEFAULT 0,
	"cost" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar,
	"request_id" varchar,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parts_used" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"inventory_item_id" varchar,
	"part_name" varchar(200) NOT NULL,
	"quantity" integer NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "property_type" NOT NULL,
	"coordinates" jsonb NOT NULL,
	"address" text,
	"image_url" varchar(500),
	"last_work_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"urgency" "urgency" NOT NULL,
	"requested_date" timestamp NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"requester_id" varchar NOT NULL,
	"property_id" varchar,
	"area_id" varchar,
	"subdivision_id" varchar,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subdivisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" varchar NOT NULL,
	"parent_id" varchar,
	"name" varchar(100) NOT NULL,
	"gps_latitude" varchar(50),
	"gps_longitude" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"note_type" "note_type" DEFAULT 'job_note' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar,
	"property_id" varchar,
	"equipment_id" varchar,
	"vehicle_id" varchar,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"urgency" "urgency" NOT NULL,
	"area_id" varchar,
	"subdivision_id" varchar,
	"initial_date" timestamp NOT NULL,
	"estimated_completion_date" timestamp,
	"actual_completion_date" timestamp,
	"assigned_to_id" varchar,
	"assigned_vendor_id" varchar,
	"task_type" "task_type" DEFAULT 'one_time' NOT NULL,
	"status" "task_status" DEFAULT 'not_started' NOT NULL,
	"on_hold_reason" text,
	"recurring_frequency" text,
	"recurring_interval" integer,
	"recurring_end_date" text,
	"contact_type" "contact_type",
	"contact_staff_id" varchar,
	"contact_name" varchar(200),
	"contact_email" varchar(200),
	"contact_phone" varchar(20),
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar,
	"request_id" varchar,
	"vehicle_id" varchar,
	"check_out_log_id" varchar,
	"check_in_log_id" varchar,
	"uploaded_by_id" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"object_path" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"password" varchar NOT NULL,
	"email" varchar,
	"phone_number" varchar(20),
	"first_name" varchar,
	"last_name" varchar,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicle_check_in_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_out_log_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"end_mileage" integer NOT NULL,
	"fuel_level" varchar(20) NOT NULL,
	"cleanliness_status" varchar(50) NOT NULL,
	"issues" text,
	"check_in_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_check_out_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"start_mileage" integer NOT NULL,
	"fuel_level" varchar(20) NOT NULL,
	"cleanliness_confirmed" boolean DEFAULT false NOT NULL,
	"damage_notes" text,
	"digital_signature" text,
	"check_out_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_maintenance_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"maintenance_type" varchar(100) NOT NULL,
	"mileage_threshold" integer,
	"time_threshold_days" integer,
	"last_performed_mileage" integer,
	"last_performed_date" timestamp,
	"next_due_mileage" integer,
	"next_due_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_reservations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar,
	"user_id" varchar NOT NULL,
	"purpose" varchar(200) NOT NULL,
	"passenger_count" integer NOT NULL,
	"notes" text,
	"key_pickup_method" varchar(50),
	"admin_notes" text,
	"advisory_accepted" boolean DEFAULT false,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"last_viewed_status" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"vehicle_id" varchar(50) NOT NULL,
	"vin" varchar(50),
	"license_plate" varchar(20),
	"category" varchar(50) NOT NULL,
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"current_mileage" integer,
	"fuel_type" varchar(50) NOT NULL,
	"passenger_capacity" integer,
	"color" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_vehicle_id_unique" UNIQUE("vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(200),
	"phone_number" varchar(20),
	"address" text,
	"contact_person" varchar(200),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_used" ADD CONSTRAINT "parts_used_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_used" ADD CONSTRAINT "parts_used_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_subdivision_id_subdivisions_id_fk" FOREIGN KEY ("subdivision_id") REFERENCES "public"."subdivisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subdivisions" ADD CONSTRAINT "subdivisions_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subdivisions" ADD CONSTRAINT "subdivisions_parent_id_subdivisions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subdivisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subdivision_id_subdivisions_id_fk" FOREIGN KEY ("subdivision_id") REFERENCES "public"."subdivisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_vendor_id_vendors_id_fk" FOREIGN KEY ("assigned_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_staff_id_users_id_fk" FOREIGN KEY ("contact_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_check_out_log_id_vehicle_check_out_logs_id_fk" FOREIGN KEY ("check_out_log_id") REFERENCES "public"."vehicle_check_out_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_check_in_log_id_vehicle_check_in_logs_id_fk" FOREIGN KEY ("check_in_log_id") REFERENCES "public"."vehicle_check_in_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_check_in_logs" ADD CONSTRAINT "vehicle_check_in_logs_check_out_log_id_vehicle_check_out_logs_id_fk" FOREIGN KEY ("check_out_log_id") REFERENCES "public"."vehicle_check_out_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_check_in_logs" ADD CONSTRAINT "vehicle_check_in_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_check_in_logs" ADD CONSTRAINT "vehicle_check_in_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_check_out_logs" ADD CONSTRAINT "vehicle_check_out_logs_reservation_id_vehicle_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."vehicle_reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_check_out_logs" ADD CONSTRAINT "vehicle_check_out_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_check_out_logs" ADD CONSTRAINT "vehicle_check_out_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_maintenance_schedules" ADD CONSTRAINT "vehicle_maintenance_schedules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_reservations" ADD CONSTRAINT "vehicle_reservations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_reservations" ADD CONSTRAINT "vehicle_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_checkin_vehicle_time" ON "vehicle_check_in_logs" USING btree ("vehicle_id","check_in_time");--> statement-breakpoint
CREATE INDEX "idx_checkout_vehicle_time" ON "vehicle_check_out_logs" USING btree ("vehicle_id","check_out_time");--> statement-breakpoint
CREATE INDEX "idx_reservation_vehicle_dates" ON "vehicle_reservations" USING btree ("vehicle_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_vehicle_status" ON "vehicles" USING btree ("status");