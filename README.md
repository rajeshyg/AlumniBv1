# Mobile-First React Application

This is a production-ready React application designed with mobile-first principles and easy portability to React Native.

## Architecture

The project follows a clean architecture pattern with the following layers:

- **UI Layer** (`src/components/`): Presentational components
- **Business Logic Layer** (`src/hooks/`, `src/store/`): Custom hooks and state management
- **Data Layer** (`src/lib/`, `src/api/`): API calls and data handling

### Key Features

- Push notifications support
- Responsive layout
- Error boundaries
- Lazy loading
- Type safety with TypeScript
- Performance optimizations
- Real-time chat functionality with Socket.IO

## React Native Migration Guide

To port this application to React Native:

1. **Components to Adapt**:
   - Replace HTML elements with React Native components
   - Update style properties to RN compatible ones
   - Use React Native's Platform-specific components

2. **Libraries to Replace**:
   - Replace `react-router-dom` with `@react-navigation/native`
   - Update notification implementation for mobile
   - Replace web-specific APIs with React Native equivalents

3. **Styling Changes**:
   - Convert Tailwind classes to StyleSheet
   - Update layout to use Flexbox properly
   - Handle platform-specific styling

4. **API/Services**:
   - Update storage mechanism (AsyncStorage)
   - Implement native push notifications
   - Handle deep linking

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/       # UI components
│   ├── layout/      # Layout components
│   ├── shared/      # Shared components
│   └── features/    # Feature-specific components
├── hooks/           # Custom hooks
├── lib/             # Utilities and services
├── pages/           # Route components
├── store/           # State management
├── types/           # TypeScript types
└── routes/          # Route configuration
```

## Best Practices

- Use platform-agnostic components where possible
- Avoid DOM-specific APIs
- Keep styling simple and compatible
- Use TypeScript for type safety
- Follow atomic design principles
- Implement proper error handling
- Use lazy loading for better performance

## Deployment

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables:
   - `VITE_SOCKET_URL`: URL of your deployed chat server

### Chat Server Deployment

The chat server is a separate Node.js application that provides real-time communication using Socket.IO. See the [chat-server README](chat-server/README.md) for detailed deployment instructions.

For a complete setup, you'll need to:
1. Deploy the chat server to a platform like Railway or Render
2. Update the frontend's `.env.production` file with the deployed chat server URL
3. Deploy the frontend to Vercel