require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
console.log('Initializing Supabase client with URL:', process.env.SUPABASE_URL);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function setupRLS() {
  try {
    console.log('Setting up Row Level Security policies...');
    
    // Enable RLS on the chat_messages table
    const { error: enableRLSError } = await supabase.rpc('enable_rls', {
      table_name: 'chat_messages'
    });
    
    if (enableRLSError) {
      console.error('Error enabling RLS:', enableRLSError);
      console.log('Trying alternative approach...');
      
      // If the RPC doesn't exist, we need to create the policies manually
      console.log('Please run the following SQL in the Supabase SQL Editor:');
      console.log(`
        -- Enable RLS on the chat_messages table
        ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow anyone to insert messages
        CREATE POLICY "Allow anyone to insert messages" 
        ON chat_messages 
        FOR INSERT 
        TO anon, authenticated 
        WITH CHECK (true);
        
        -- Create policy to allow anyone to read messages
        CREATE POLICY "Allow anyone to read messages" 
        ON chat_messages 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
        
        -- Create policy to allow users to update their own messages
        CREATE POLICY "Allow users to update their own messages" 
        ON chat_messages 
        FOR UPDATE 
        TO anon, authenticated 
        USING (sender_id = auth.uid())
        WITH CHECK (sender_id = auth.uid());
        
        -- Create policy to allow users to delete their own messages
        CREATE POLICY "Allow users to delete their own messages" 
        ON chat_messages 
        FOR DELETE 
        TO anon, authenticated 
        USING (sender_id = auth.uid());
      `);
    } else {
      console.log('RLS enabled successfully!');
    }
    
    // Enable RLS on the chat_participants table
    const { error: enableParticipantsRLSError } = await supabase.rpc('enable_rls', {
      table_name: 'chat_participants'
    });
    
    if (enableParticipantsRLSError) {
      console.error('Error enabling RLS on chat_participants:', enableParticipantsRLSError);
      console.log('Trying alternative approach...');
      
      // If the RPC doesn't exist, we need to create the policies manually
      console.log('Please run the following SQL in the Supabase SQL Editor:');
      console.log(`
        -- Enable RLS on the chat_participants table
        ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow anyone to insert participants
        CREATE POLICY "Allow anyone to insert participants" 
        ON chat_participants 
        FOR INSERT 
        TO anon, authenticated 
        WITH CHECK (true);
        
        -- Create policy to allow anyone to read participants
        CREATE POLICY "Allow anyone to read participants" 
        ON chat_participants 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
        
        -- Create policy to allow users to update their own participant records
        CREATE POLICY "Allow users to update their own participant records" 
        ON chat_participants 
        FOR UPDATE 
        TO anon, authenticated 
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
        -- Create policy to allow users to delete their own participant records
        CREATE POLICY "Allow users to delete their own participant records" 
        ON chat_participants 
        FOR DELETE 
        TO anon, authenticated 
        USING (user_id = auth.uid());
      `);
    } else {
      console.log('RLS enabled on chat_participants successfully!');
    }
    
    // Enable RLS on the chats table
    const { error: enableChatsRLSError } = await supabase.rpc('enable_rls', {
      table_name: 'chats'
    });
    
    if (enableChatsRLSError) {
      console.error('Error enabling RLS on chats:', enableChatsRLSError);
      console.log('Trying alternative approach...');
      
      // If the RPC doesn't exist, we need to create the policies manually
      console.log('Please run the following SQL in the Supabase SQL Editor:');
      console.log(`
        -- Enable RLS on the chats table
        ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow anyone to insert chats
        CREATE POLICY "Allow anyone to insert chats" 
        ON chats 
        FOR INSERT 
        TO anon, authenticated 
        WITH CHECK (true);
        
        -- Create policy to allow anyone to read chats
        CREATE POLICY "Allow anyone to read chats" 
        ON chats 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
        
        -- Create policy to allow users to update chats they participate in
        CREATE POLICY "Allow users to update chats they participate in" 
        ON chats 
        FOR UPDATE 
        TO anon, authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_id = chats.id AND user_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_id = chats.id AND user_id = auth.uid()
          )
        );
        
        -- Create policy to allow users to delete chats they participate in
        CREATE POLICY "Allow users to delete chats they participate in" 
        ON chats 
        FOR DELETE 
        TO anon, authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_id = chats.id AND user_id = auth.uid()
          )
        );
      `);
    } else {
      console.log('RLS enabled on chats successfully!');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupRLS(); 