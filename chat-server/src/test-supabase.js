require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
console.log('Initializing Supabase client with URL:', process.env.SUPABASE_URL);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testInsertMessage() {
  try {
    console.log('Testing message insertion...');
    
    // Generate UUIDs
    const messageId = crypto.randomUUID();
    const chatId = crypto.randomUUID();
    
    console.log('Generated UUIDs:', { messageId, chatId });
    
    const testMessage = {
      id: messageId,
      chat_id: chatId,
      sender_id: 'test-user',
      content: 'Test message',
      created_at: new Date().toISOString()
    };
    
    console.log('Inserting test message:', testMessage);
    
    // First, let's try to create the chat if it doesn't exist
    const { error: chatError } = await supabase
      .from('chats')
      .insert([{
        id: chatId,
        name: 'Test Chat',
        created_at: new Date().toISOString()
      }])
      .select();
      
    if (chatError) {
      console.error('Error creating test chat:', chatError);
    } else {
      console.log('Test chat created successfully');
    }
    
    // Now try to insert the message
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([testMessage])
      .select();
    
    if (error) {
      console.error('Error inserting test message:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If we get a type error, let's try with explicit type casting
      if (error.code === '22P02') {
        console.log('Trying with explicit type casting...');
        const { data: castData, error: castError } = await supabase.rpc('insert_test_message', {
          p_id: messageId,
          p_chat_id: chatId,
          p_sender_id: 'test-user',
          p_content: 'Test message',
          p_created_at: new Date().toISOString()
        });
        
        if (castError) {
          console.error('Error with type casting:', castError);
        } else {
          console.log('Message inserted successfully with type casting:', castData);
        }
      }
    } else {
      console.log('Test message inserted successfully:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testInsertMessage(); 