require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
console.log('Initializing Supabase client with URL:', process.env.SUPABASE_URL);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function setupDatabase() {
  try {
    console.log('Checking if chat_messages table exists...');
    
    // Check if the table exists by trying to select from it
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking table:', error);
      
      // If the error is about the table not existing, create it
      if (error.code === '42P01') {
        console.log('Table does not exist, creating it...');
        
        // Create the table using SQL
        const { error: createError } = await supabase.rpc('create_chat_messages_table');
        
        if (createError) {
          console.error('Error creating table:', createError);
          
          // If the RPC doesn't exist, we need to create the table manually
          console.log('Trying to create table manually...');
          
          // This is a fallback approach - you might need to create the table through the Supabase dashboard
          console.log('Please create the chat_messages table in the Supabase dashboard with the following structure:');
          console.log(`
            CREATE TABLE chat_messages (
              id TEXT PRIMARY KEY,
              chat_id TEXT NOT NULL,
              sender_id TEXT NOT NULL,
              content TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);
        } else {
          console.log('Table created successfully!');
        }
      }
    } else {
      console.log('Table exists!');
    }
    
    // Check if chat_participants table exists
    console.log('Checking if chat_participants table exists...');
    const { data: participantsData, error: participantsError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .limit(1);
    
    if (participantsError) {
      console.error('Error checking chat_participants table:', participantsError);
      
      // If the error is about the table not existing, create it
      if (participantsError.code === '42P01') {
        console.log('chat_participants table does not exist, creating it...');
        
        // Create the table using SQL
        const { error: createError } = await supabase.rpc('create_chat_participants_table');
        
        if (createError) {
          console.error('Error creating chat_participants table:', createError);
          
          // If the RPC doesn't exist, we need to create the table manually
          console.log('Trying to create chat_participants table manually...');
          
          // This is a fallback approach - you might need to create the table through the Supabase dashboard
          console.log('Please create the chat_participants table in the Supabase dashboard with the following structure:');
          console.log(`
            CREATE TABLE chat_participants (
              id SERIAL PRIMARY KEY,
              chat_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(chat_id, user_id)
            );
          `);
        } else {
          console.log('chat_participants table created successfully!');
        }
      }
    } else {
      console.log('chat_participants table exists!');
    }
    
    // Check if chats table exists
    console.log('Checking if chats table exists...');
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .limit(1);
    
    if (chatsError) {
      console.error('Error checking chats table:', chatsError);
      
      // If the error is about the table not existing, create it
      if (chatsError.code === '42P01') {
        console.log('chats table does not exist, creating it...');
        
        // Create the table using SQL
        const { error: createError } = await supabase.rpc('create_chats_table');
        
        if (createError) {
          console.error('Error creating chats table:', createError);
          
          // If the RPC doesn't exist, we need to create the table manually
          console.log('Trying to create chats table manually...');
          
          // This is a fallback approach - you might need to create the table through the Supabase dashboard
          console.log('Please create the chats table in the Supabase dashboard with the following structure:');
          console.log(`
            CREATE TABLE chats (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              post_id TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);
        } else {
          console.log('chats table created successfully!');
        }
      }
    } else {
      console.log('chats table exists!');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupDatabase(); 