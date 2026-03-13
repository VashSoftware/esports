CREATE INDEX "idx_mappool_slot_mappool" ON "mappool_slot" USING btree ("mappool_id");--> statement-breakpoint
CREATE INDEX "idx_match_created_at" ON "match" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_mpp_user" ON "match_participant_player" USING btree ("user_id");