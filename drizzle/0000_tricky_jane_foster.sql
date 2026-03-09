CREATE TABLE "mappool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mappool_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mappool_id" uuid NOT NULL,
	"category" text NOT NULL,
	"order_in_category" integer NOT NULL,
	"beatmap_id" text NOT NULL,
	"star_rating" real,
	"bpm" real,
	"total_length" integer,
	"mods" text[] DEFAULT '{}' NOT NULL,
	"title" text,
	"artist" text,
	"version" text,
	"cover_url" text,
	"list_cover_url" text
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"state" text DEFAULT 'CREATED' NOT NULL,
	"config" jsonb NOT NULL,
	"mappool_id" uuid,
	"osu_lobby_id" integer,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"winner_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"game_number" integer NOT NULL,
	"mappool_slot_id" uuid NOT NULL,
	"picked_by_participant_id" uuid,
	"winner_participant_id" uuid,
	"state" text DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match_game_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"accuracy" real DEFAULT 0 NOT NULL,
	"max_combo" integer DEFAULT 0 NOT NULL,
	"count_300" integer DEFAULT 0 NOT NULL,
	"count_100" integer DEFAULT 0 NOT NULL,
	"count_50" integer DEFAULT 0 NOT NULL,
	"count_miss" integer DEFAULT 0 NOT NULL,
	"mods" text[] DEFAULT '{}' NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"pp" real
);
--> statement-breakpoint
CREATE TABLE "match_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" text NOT NULL,
	"creator_team_id" uuid NOT NULL,
	"invited_team_id" uuid NOT NULL,
	"config" jsonb NOT NULL,
	"mappool_id" uuid NOT NULL,
	"name" text,
	"message" text,
	"scheduled_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"match_id" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"roll_value" integer,
	"pick_order" integer
);
--> statement-breakpoint
CREATE TABLE "match_participant_player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"team_id" uuid NOT NULL,
	"elo" integer DEFAULT 1000 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"reference_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"actioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"elo" integer DEFAULT 1000 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"initial_elo" integer,
	"osu_rank_at_seed" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_rating_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_personal" boolean DEFAULT false NOT NULL,
	"owner_id" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member',
	"joined_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'player' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mappool_slot" ADD CONSTRAINT "mappool_slot_mappool_id_mappool_id_fk" FOREIGN KEY ("mappool_id") REFERENCES "public"."mappool"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_mappool_id_mappool_id_fk" FOREIGN KEY ("mappool_id") REFERENCES "public"."mappool"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_winner_id_team_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_game" ADD CONSTRAINT "match_game_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_game" ADD CONSTRAINT "match_game_mappool_slot_id_mappool_slot_id_fk" FOREIGN KEY ("mappool_slot_id") REFERENCES "public"."mappool_slot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_game" ADD CONSTRAINT "match_game_picked_by_participant_id_match_participant_id_fk" FOREIGN KEY ("picked_by_participant_id") REFERENCES "public"."match_participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_game" ADD CONSTRAINT "match_game_winner_participant_id_match_participant_id_fk" FOREIGN KEY ("winner_participant_id") REFERENCES "public"."match_participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_game_score" ADD CONSTRAINT "match_game_score_match_game_id_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."match_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_game_score" ADD CONSTRAINT "match_game_score_player_id_match_participant_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."match_participant_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_invite" ADD CONSTRAINT "match_invite_creator_team_id_team_id_fk" FOREIGN KEY ("creator_team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_invite" ADD CONSTRAINT "match_invite_invited_team_id_team_id_fk" FOREIGN KEY ("invited_team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_invite" ADD CONSTRAINT "match_invite_mappool_id_mappool_id_fk" FOREIGN KEY ("mappool_id") REFERENCES "public"."mappool"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_invite" ADD CONSTRAINT "match_invite_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant_player" ADD CONSTRAINT "match_participant_player_participant_id_match_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."match_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_queue" ADD CONSTRAINT "match_queue_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_match_state" ON "match" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_match_game_match" ON "match_game" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_mgs_game" ON "match_game_score" USING btree ("match_game_id");--> statement-breakpoint
CREATE INDEX "idx_invite_invited_team" ON "match_invite" USING btree ("invited_team_id");--> statement-breakpoint
CREATE INDEX "idx_invite_created_by" ON "match_invite" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_invite_status" ON "match_invite" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mp_match_team" ON "match_participant" USING btree ("match_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mp_match_slot" ON "match_participant" USING btree ("match_id","slot");--> statement-breakpoint
CREATE INDEX "idx_mp_match" ON "match_participant" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mpp_participant_user" ON "match_participant_player" USING btree ("participant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_mpp_participant" ON "match_participant_player" USING btree ("participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_queue_user" ON "match_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_queue_elo" ON "match_queue" USING btree ("elo");--> statement-breakpoint
CREATE INDEX "idx_notification_user" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_user_read" ON "notification" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");