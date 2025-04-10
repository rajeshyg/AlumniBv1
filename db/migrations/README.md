# Database Migrations

This directory contains SQL scripts for database migrations.

## How to Apply Migrations

### Applying the Last Message Trigger

The `update_chat_last_message_trigger.sql` script adds a database trigger that automatically updates the `last_message_id` and `last_message_time` fields in the `chats` table whenever a new message is inserted into the `chat_messages` table.

To apply this migration:

1. Connect to your Supabase database using the SQL Editor in the Supabase dashboard
2. Copy the contents of `update_chat_last_message_trigger.sql`
3. Paste the SQL into the editor and run it
4. Verify the trigger was created by checking the list of triggers in your database

Alternatively, you can run the script using the Supabase CLI:

```bash
supabase db execute --file db/migrations/update_chat_last_message_trigger.sql
```

## Benefits of the Last Message Trigger

This trigger ensures that:

1. The `last_message_id` is always up-to-date
2. The `last_message_time` is always synchronized with the most recent message
3. Chat previews in the UI will always show the correct last message
4. Data consistency is maintained at the database level rather than relying on client-side code

## Troubleshooting

If you encounter any issues with the trigger:

1. Check the Supabase logs for any error messages
2. Verify the trigger exists by querying the `pg_trigger` system table:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_chat_last_message';
```

3. Test the trigger by inserting a new message and checking if the chat record is updated:

```sql
-- Insert a test message
INSERT INTO chat_messages (id, chat_id, sender_id, content, created_at, updated_at)
VALUES ('test_msg_id', 'test_chat_id', 'test_user_id', 'Test message', NOW(), NOW());

-- Check if the chat was updated
SELECT last_message_id, last_message_time FROM chats WHERE id = 'test_chat_id';
```
