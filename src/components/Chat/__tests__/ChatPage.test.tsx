import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ChatPage from '../ChatPage';
import { ChatService } from '../../../services/ChatService';
import { Chat, ChatMessage } from '../../../models/Chat';
import { AuthProvider } from '../../../context/AuthContext';

// Mock the ChatService
vi.mock('../../../services/ChatService');

// Mock the auth context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    authState: {
      currentUser: {
        studentId: 'user-1',
        name: 'Test User',
        email: 'test@example.com'
      }
    }
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('ChatPage', () => {
  const mockChats: Chat[] = [
    {
      id: 'chat-1',
      postId: 'post-1',
      name: 'Test Chat 1',
      participants: ['user-1', 'user-2'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'chat-2',
      postId: 'post-2',
      name: 'Test Chat 2',
      participants: ['user-1', 'user-3'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      content: 'Hello!',
      timestamp: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (ChatService.getUserChats as any).mockReturnValue(mockChats);
    (ChatService.getChatMessages as any).mockReturnValue(mockMessages);
  });

  it('renders chat list and empty state initially', async () => {
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );
    
    await waitFor(() => {
      // Check if chat list is rendered
      expect(screen.getByText('Chats')).toBeInTheDocument();
      expect(screen.getByText('New Chat')).toBeInTheDocument();
      
      // Check if empty state is shown
      expect(screen.getByText('Welcome to Chat')).toBeInTheDocument();
      expect(screen.getByText('Select a chat or create a new one to start messaging')).toBeInTheDocument();
    });
  });

  it('displays list of chats', async () => {
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );
    
    await waitFor(() => {
      // Check if mock chats are displayed
      expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
    });
  });

  it('creates a new chat when New Chat button is clicked', async () => {
    const newChat: Chat = {
      id: 'chat-3',
      postId: 'post-3',
      name: 'New Chat',
      participants: ['user-1'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    (ChatService.createChat as any).mockReturnValue(newChat);
    (ChatService.getChatMessages as any).mockReturnValue([]);
    
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });
    
    // Click New Chat button
    fireEvent.click(screen.getByText('New Chat'));
    
    await waitFor(() => {
      // Fill in the chat name
      const nameInput = screen.getByPlaceholderText('Enter chat name...');
      fireEvent.change(nameInput, { target: { value: 'New Chat' } });
      
      // Click create button
      fireEvent.click(screen.getByText('Create Chat'));
      
      // Check if new chat is added to the list
      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });
  });

  it('selects a chat when clicked', async () => {
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );
    
    // Wait for initial render and find the chat list
    await waitFor(() => {
      expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
    });
    
    // Find the chat list container
    const chatList = screen.getByRole('list');
    
    // Find the chat item within the list
    const chatItem = within(chatList).getByRole('listitem', { name: 'Test Chat 1' });
    
    // Click the chat item
    fireEvent.click(chatItem);
    
    await waitFor(() => {
      // Check if chat window is shown with correct header
      const chatHeader = screen.getByRole('heading', { name: 'Test Chat 1' });
      expect(chatHeader).toBeInTheDocument();
      
      // Check participant count
      const participantCount = screen.getByText('2 participants');
      expect(participantCount).toBeInTheDocument();
      
      // Check if message input is present
      const messageInput = screen.getByPlaceholderText('Type a message...');
      expect(messageInput).toBeInTheDocument();
    });
  });

  it('handles chat selection error gracefully', async () => {
    // Mock console.error to prevent error output in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock ChatService to throw an error
    (ChatService.getUserChats as any).mockImplementation(() => {
      throw new Error('Failed to load chats');
    });
    
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );
    
    await waitFor(() => {
      // Check if error state is handled
      expect(screen.getByText('Welcome to Chat')).toBeInTheDocument();
      expect(screen.getByText('Select a chat or create a new one to start messaging')).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });
}); 