require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Initialize Supabase client
console.log('Initializing Supabase client with URL:', process.env.SUPABASE_URL);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('chat_messages').select('id').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful!');
    }
  } catch (error) {
    console.error('Unexpected error testing Supabase connection:', error);
  }
}

testSupabaseConnection();

// Store active users
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_chat', (chatId) => {
    console.log(`User ${socket.id} joining chat: ${chatId}`);
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  socket.on('leave_chat', (chatId) => {
    console.log(`User ${socket.id} leaving chat: ${chatId}`);
    socket.leave(chatId);
    console.log(`User ${socket.id} left chat: ${chatId}`);
  });

  socket.on('send_message', async (message) => {
    console.log('Received message to save:', message);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          id: message.id,
          chat_id: message.chatId,
          sender_id: message.senderId,
          content: message.content,
          created_at: message.timestamp,
          read_by: message.readBy
        }])
        .select();

      if (error) {
        console.error('Error saving message:', error);
        return;
      }

      console.log('Message saved successfully:', data);
      
      // Log the room members before broadcasting
      const room = io.sockets.adapter.rooms.get(message.chatId);
      console.log(`Broadcasting message to chat ${message.chatId}. Room members:`, room ? Array.from(room) : 'No members');
      
      // Broadcast to all clients in the chat room
      io.to(message.chatId).emit('new_message', {
        ...message,
        id: data[0].id,
        timestamp: data[0].created_at
      });
      
      console.log(`Message broadcasted to chat ${message.chatId}`);
    } catch (error) {
      console.error('Error in send_message handler:', error);
    }
  });

  // Handle chat creation
  socket.on('create_chat', async (chatData) => {
    console.log('Received chat creation request:', chatData);
    
    try {
      // First, save the chat to the chats table
      const { data: chatResult, error: chatError } = await supabase
        .from('chats')
        .insert([{
          id: chatData.id,
          name: chatData.name,
          post_id: chatData.postId || null,
          created_at: chatData.createdAt,
          updated_at: chatData.updatedAt
        }])
        .select();
      
      if (chatError) {
        console.error('Error saving chat:', chatError);
        return;
      }
      
      console.log('Chat saved successfully:', chatResult);
      
      // Then, save all participants to the chat_participants table
      const participantRecords = chatData.participants.map(userId => ({
        chat_id: chatData.id,
        user_id: userId,
        joined_at: new Date().toISOString()
      }));
      
      const { data: participantResult, error: participantError } = await supabase
        .from('chat_participants')
        .insert(participantRecords)
        .select();
      
      if (participantError) {
        console.error('Error saving participants:', participantError);
        return;
      }
      
      console.log('Participants saved successfully:', participantResult);
      
      // Notify all participants that the chat was created
      chatData.participants.forEach(userId => {
        io.emit(`chat_created_${userId}`, chatData);
      });
      
    } catch (error) {
      console.error('Error in create_chat handler:', error);
    }
  });
  
  // Handle adding a participant to a chat
  socket.on('add_participant', async (data) => {
    console.log('Adding participant to chat:', data);
    
    try {
      const { data: result, error } = await supabase
        .from('chat_participants')
        .insert([{
          chat_id: data.chatId,
          user_id: data.userId,
          joined_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error('Error adding participant:', error);
        return;
      }
      
      console.log('Participant added successfully:', result);
      
      // Notify all participants in the chat that a new participant was added
      io.to(data.chatId).emit('participant_added', {
        chatId: data.chatId,
        userId: data.userId
      });
      
    } catch (error) {
      console.error('Error in add_participant handler:', error);
    }
  });
  
  // Handle removing a participant from a chat
  socket.on('remove_participant', async (data) => {
    console.log('Removing participant from chat:', data);
    
    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .match({
          chat_id: data.chatId,
          user_id: data.userId
        });
      
      if (error) {
        console.error('Error removing participant:', error);
        return;
      }
      
      console.log('Participant removed successfully');
      
      // Notify all participants in the chat that a participant was removed
      io.to(data.chatId).emit('participant_removed', {
        chatId: data.chatId,
        userId: data.userId
      });
      
    } catch (error) {
      console.error('Error in remove_participant handler:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user_typing', {
      userId: data.userId,
      chatId: data.chatId
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.chatId).emit('user_stop_typing', {
      userId: data.userId,
      chatId: data.chatId
    });
  });

  // Handle user joining (online status)
  socket.on('user_online', async (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit('user_status_change', { userId, status: 'online' });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and remove user from active users
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        io.emit('user_status_change', { userId, status: 'offline' });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to validate UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 