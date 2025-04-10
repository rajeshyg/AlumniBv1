# Chat Module Documentation

This document provides a comprehensive overview of the chat module implementation, including the recent improvements and fixes.

## Architecture

The chat module uses a hybrid approach with two real-time systems:

1. **Socket.IO** - For real-time messaging and typing indicators
2. **Supabase** - For database storage and synchronization

### Components

- **ChatService.ts** - Core service that handles communication with the server and database
- **ChatPage.tsx** - Main chat UI component that displays the chat list
- **ChatWindow.tsx** - Component for displaying and interacting with a specific chat
- **chat-server/index.js** - Socket.IO server implementation

## Recent Improvements

### 1. Server-Side Typing Timeout

Added a server-side timeout mechanism to automatically clear typing status after a period of inactivity:

```javascript
// In chat-server/index.js
const typingTimeouts = new Map();

socket.on('typing', (data) => {
  const { chatId, userId, isTyping } = data;
  
  // Clear any existing timeout
  const timeoutKey = `${chatId}:${userId}`;
  if (typingTimeouts.has(timeoutKey)) {
    clearTimeout(typingTimeouts.get(timeoutKey));
    typingTimeouts.delete(timeoutKey);
  }
  
  // Set a new timeout if user is typing
  if (isTyping) {
    const timeout = setTimeout(() => {
      // Auto-clear typing status after timeout
      io.to(chatId).emit('typing', {
        chatId,
        userId,
        isTyping: false
      });
      
      typingTimeouts.delete(timeoutKey);
    }, 5000); // 5 seconds timeout
    
    typingTimeouts.set(timeoutKey, timeout);
  }
  
  // Broadcast typing status to all clients
  io.to(chatId).emit('typing', { chatId, userId, isTyping });
});
```

### 2. Proper Zustand State Management

Fixed the state management in ChatPage.tsx to use proper reactive selectors:

```typescript
// Use proper reactive selectors for Zustand state
const chats = useChatStore(state => state.chats);
const loadChats = useChatStore(state => state.loadChats);

// Use useMemo for derived state
const filteredAndSortedChats = useMemo(() => {
  // Apply search filter if query exists
  let filtered = searchQuery?.trim()
    ? chats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;
    
  // Sort by last message time
  return [...filtered].sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });
}, [chats, searchQuery]);
```

### 3. Database Trigger for Last Message Updates

Added a database trigger to automatically update the `last_message_id` when new messages are inserted:

```sql
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_message_id = NEW.id,
      last_message_time = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();
```

### 4. Enhanced Error Handling

Improved error handling in ChatService.ts with retry logic and better logging:

```typescript
// Add retry logic for network failures
let retries = 0;
const maxRetries = 3;

while (retries < maxRetries) {
  try {
    // API call...
    break; // Success, exit loop
  } catch (e) {
    logger.warn(`Network error (attempt ${retries + 1}/${maxRetries}):`, e);
    retries++;
    
    // Exponential backoff before retrying
    const backoffTime = Math.min(1000 * Math.pow(2, retries), 5000);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }
}
```

## Key Features

### Real-Time Messaging

Messages are sent and received in real-time using Socket.IO:

1. Client sends a message via `ChatService.sendMessage()`
2. Server receives the message, saves it to Supabase, and broadcasts it to all clients in the chat room
3. Clients receive the message via Socket.IO and update their UI

### Typing Indicators

Typing indicators are implemented using Socket.IO:

1. Client sends a typing event via `ChatService.setTypingStatus()`
2. Server broadcasts the typing status to all clients in the chat room
3. Server sets a timeout to automatically clear the typing status after 5 seconds of inactivity
4. Clients receive typing updates and display them in the UI

### Chat List with Message Previews

The chat list displays a preview of the last message for each chat:

1. When loading chats, the `lastMessage` property is populated with the most recent message
2. The chat list is sorted by the most recent message time
3. The UI displays the last message content and timestamp

## Best Practices

### State Management

- Use reactive selectors with Zustand: `useChatStore(state => state.property)`
- Avoid direct `getState()` calls in render logic or effects
- Use `useMemo` for derived state to avoid unnecessary recalculations

### Error Handling

- Implement retry logic for network operations
- Use exponential backoff to avoid overwhelming the server
- Log detailed error information for debugging

### Performance Optimization

- Debounce typing events to reduce network traffic
- Use memoization to avoid unnecessary recalculations
- Implement proper cleanup for subscriptions and timeouts

## Troubleshooting

### Typing Indicator Issues

If typing indicators are not working correctly:

1. Check the Socket.IO connection in the browser console
2. Verify that typing events are being sent and received
3. Check for any errors in the server logs

### Message Delivery Issues

If messages are not being delivered:

1. Check the Socket.IO connection
2. Verify that the user is in the correct chat room
3. Check for any errors in the server logs
4. Verify that the message was saved to the database

### Chat List Issues

If the chat list is not showing the correct last message:

1. Check the database to ensure the `last_message_id` is set correctly
2. Verify that the database trigger is working
3. Check for any errors in the client logs

## Future Improvements

1. **Pagination** - Implement pagination for loading messages to improve performance
2. **Offline Support** - Add offline message queuing and synchronization
3. **Read Receipts** - Implement read receipts to show when messages have been read
4. **Message Reactions** - Add support for emoji reactions to messages
5. **File Attachments** - Implement file attachment support
