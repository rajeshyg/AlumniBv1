import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPage from './ChatPage';
import { ChatService } from '../../services/ChatService';
import { AuthProvider } from '../../context/AuthContext';
import { mockUser } from '../../mocks/mockData';

// Mock the ChatService
vi.mock('../../services/ChatService');

describe('ChatPage', () => {
  const mockChats = [
    {
      id: '1',
      name: 'Test Chat 1',
      participants: ['user1', 'user2'],
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Test Chat 2',
      participants: ['user1', 'user3'],
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    (ChatService.getUserChats as jest.Mock).mockReturnValue(mockChats);
  });

  it('renders chat list and empty state', () => {
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );

    expect(screen.getByText('Chats')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Select a chat to start messaging')).toBeInTheDocument();
  });

  it('displays list of chats', () => {
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );

    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
  });

  it('selects a chat when clicked', () => {
    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Test Chat 1'));
    expect(screen.queryByText('Select a chat to start messaging')).not.toBeInTheDocument();
  });

  it('creates a new chat', () => {
    const newChat = {
      id: '3',
      name: 'New Chat',
      participants: ['user1'],
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (ChatService.createChat as jest.Mock).mockResolvedValue(newChat);

    render(
      <AuthProvider>
        <ChatPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('New Chat'));
    expect(ChatService.createChat).toHaveBeenCalled();
  });
}); 