# Chat Server

This is a Socket.IO server for real-time chat functionality in the Alumbi application.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=3002
   CLIENT_URL=http://localhost:3004
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the server:
   ```
   npm run dev
   ```

## Deployment

### Deploying to Railway

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Add the following environment variables:
   - `PORT`: 3002 (or let Railway assign a port)
   - `CLIENT_URL`: Your Vercel app URL (e.g., https://your-app.vercel.app)
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

4. Deploy the project

### Deploying to Render

1. Create a new Web Service on [Render](https://render.com/)
2. Connect your GitHub repository
3. Set the following:
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
4. Add the environment variables as mentioned above
5. Deploy the service

## Updating the Frontend

After deploying the chat server, update the `.env.production` file in the main project with the URL of your deployed chat server:

```
VITE_SOCKET_URL=https://your-chat-server-url.com
```

This URL will be used by the frontend to connect to the Socket.IO server in production. 