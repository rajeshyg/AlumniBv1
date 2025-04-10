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

// Add a Set to track recently processed message IDs to prevent duplicates
const recentlyProcessedMessages = new Set();

// Clear the set periodically to prevent memory leaks
setInterval(() => {
  console.log(`Clearing message ID cache. Size before clearing: ${recentlyProcessedMessages.size}`);
  recentlyProcessedMessages.clear();
}, 1000 * 60 * 5); // Clear every 5 minutes

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Get the userId from the auth data provided during connection
  const userId = socket.handshake.auth.userId;
  if (userId) {
    console.log(`User ${socket.id} authenticated as user ID: ${userId}`);

    // Automatically join the user to their user-specific room
    const userRoom = `user_${userId}`;
    socket.join(userRoom);
    console.log(`User ${socket.id} automatically joined room: ${userRoom}`);

    // Add to active users
    activeUsers.set(userId, socket.id);
    io.emit('user_status_change', { userId, status: 'online' });
  } else {
    console.log(`User ${socket.id} connected without authentication`);
  }

  socket.on('join_chat', (chatId) => {
    console.log(`User ${socket.id} joining chat: ${chatId}`);
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  socket.on('join_user_room', (userId) => {
    console.log(`User ${socket.id} joining user-specific room: user_${userId}`);
    socket.join(`user_${userId}`);
    console.log(`User ${socket.id} joined user-specific room: user_${userId}`);
  });

  socket.on('leave_chat', (chatId) => {
    console.log(`User ${socket.id} leaving chat: ${chatId}`);
    socket.leave(chatId);
    console.log(`User ${socket.id} left chat: ${chatId}`);
  });

  // Improved message handling to prevent duplicates
  socket.on('send_message', async (message) => {
    try {
      console.log('Received message to save:', message);

      // CRITICAL FIX: When a user sends a message, automatically clear their typing status
      // This ensures the typing indicator disappears after sending a message
      io.to(message.chatId).emit('typing', {
        chatId: message.chatId,
        userId: message.senderId,
        isTyping: false
      });

      // Also send to user-specific rooms
      try {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', message.chatId);

        if (participants) {
          participants.forEach(p => {
            if (p.user_id !== message.senderId) {
              io.to(`user_${p.user_id}`).emit('typing', {
                chatId: message.chatId,
                userId: message.senderId,
                isTyping: false
              });
            }
          });
        }
      } catch (err) {
        console.error('Error clearing typing status after message:', err);
      }

      // Check if we've recently processed this message ID
      if (recentlyProcessedMessages.has(message.id)) {
        console.log(`Ignoring duplicate message: ${message.id}`);
        return;
      }

      // Add to recently processed messages
      recentlyProcessedMessages.add(message.id);

      // Generate a cleaner message ID for the database
      const cleanerId = `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // Before saving, check if a very similar message already exists in the database
      // (prevents database duplicates by checking content + timestamp proximity)
      try {
        const { data: existingMessages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_id', message.chatId)
          .eq('sender_id', message.senderId)
          .eq('content', message.content)
          .gte('created_at', new Date(new Date(message.timestamp).getTime() - 5000).toISOString())
          .lte('created_at', new Date(new Date(message.timestamp).getTime() + 5000).toISOString());

        if (existingMessages && existingMessages.length > 0) {
          console.log('Found existing similar message, not saving duplicate:', {
            existingId: existingMessages[0].id,
            content: message.content,
            timeDiff: new Date(existingMessages[0].created_at) - new Date(message.timestamp) + 'ms'
          });

          // Use the existing message ID for broadcasting
          message.id = existingMessages[0].id;

          // Skip database save, but continue with broadcasting
        } else {
          // No similar message found, proceed with database save
          const msgToSave = {
            id: cleanerId,
            chat_id: message.chatId,
            sender_id: message.senderId,
            content: message.content,
            created_at: message.timestamp,
            updated_at: new Date().toISOString(),
            read_by: message.readBy || [message.senderId]
          };

          // Save to database
          const { data, error } = await supabase
            .from('chat_messages')
            .insert(msgToSave)
            .select();

          if (error) {
            console.error('Error saving message to database:', error);
          } else {
            console.log('Message saved successfully:', data);

            // Use the database ID for broadcasting to ensure consistency
            message.id = data[0].id;

            // Also update the last message in the chat
            try {
              const { error: updateError } = await supabase
                .from('chats')
                .update({
                  last_message_id: message.id,
                  last_message_time: message.timestamp,
                  updated_at: new Date().toISOString()
                })
                .eq('id', message.chatId);

              if (updateError) {
                console.error('Error updating chat last message:', updateError);
              }
            } catch (updateError) {
              console.error('Failed to update chat with last message:', updateError);
            }
          }
        }
      } catch (dbError) {
        console.error('Database error when checking for duplicates:', dbError);
      }

      // Get the room for this chat
      const roomName = message.chatId;
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log(`Broadcasting to chat room ${roomName}. Members: ${room ? Array.from(room) : 'none'}`);

      // Broadcast to the specific chat room
      socket.to(roomName).emit('new_message', message);

      // Also broadcast to user-specific rooms for participants
      try {
        // Get all participants for this chat
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', message.chatId);

        if (participants && participants.length) {
          console.log(`Broadcasting to ${participants.length} participants in chat ${message.chatId}`);

          participants.forEach(p => {
            const userRoom = `user_${p.user_id}`;
            console.log(`Broadcasting to user-specific room: ${userRoom}`);
            socket.to(userRoom).emit('new_message', message);
          });
        }
      } catch (participantError) {
        console.error('Error getting chat participants:', participantError);
      }

      // Also emit a message_update event for older clients
      io.emit('message_update', message.chatId);

      console.log(`Message broadcasted to chat ${message.chatId}`);
    } catch (error) {
      console.error('Error processing message:', error);

      // Still try to broadcast the message even if there was an error
      try {
        socket.to(message.chatId).emit('new_message', message);
        io.emit('message_update', message.chatId);
      } catch (broadcastError) {
        console.error('Failed to broadcast message after error:', broadcastError);
      }
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
    console.log('Received typing notification:', data);

    // Log the room and members for debugging
    const room = io.sockets.adapter.rooms.get(data.chatId);
    console.log(`Sending typing notification to chat ${data.chatId}. Room members:`, room ? Array.from(room) : 'No members');

    // CRITICAL FIX: Use io.to instead of socket.to to ensure all clients receive the update
    // This is the same fix we applied to message broadcasting
    io.to(data.chatId).emit('typing', {
      chatId: data.chatId,
      userId: data.userId,
      isTyping: data.isTyping // Use the isTyping value from the data object
    });

    // ALSO broadcast to user-specific rooms to ensure delivery
    // First get chat participants
    (async () => {
      try {
        const { data: participants, error: participantsError } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', data.chatId);

        if (!participantsError && participants) {
          participants.forEach(p => {
            // Don't send to the user who is typing
            if (p.user_id !== data.userId) {
              console.log(`Broadcasting typing to user-specific room: user_${p.user_id}`);
              io.to(`user_${p.user_id}`).emit('typing', {
                chatId: data.chatId,
                userId: data.userId,
                isTyping: data.isTyping // Use the isTyping value from the data object
              });
            }
          });
        }
      } catch (err) {
        console.error('Error getting participants for typing notification:', err);
      }
    })();

    console.log(`Typing notification sent for user ${data.userId} in chat ${data.chatId}, isTyping: ${data.isTyping}`);
  });

  // We don't need a separate stop_typing event handler since we're using the isTyping flag
  // in the typing event. This simplifies the code and reduces duplication.
  // The client will now send a 'typing' event with isTyping=false instead of 'stop_typing'

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