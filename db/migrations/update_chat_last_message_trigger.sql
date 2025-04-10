-- Add a database trigger to automatically update last_message_id when new messages are inserted
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the chat record with the new message information
  UPDATE chats
  SET last_message_id = NEW.id,
      last_message_time = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS trigger_update_chat_last_message ON chat_messages;

-- Create the trigger
CREATE TRIGGER trigger_update_chat_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- Add a comment explaining the trigger
COMMENT ON TRIGGER trigger_update_chat_last_message ON chat_messages IS 
'Automatically updates the last_message_id and last_message_time in the chats table when a new message is inserted.';
