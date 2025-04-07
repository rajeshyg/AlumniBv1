import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { X, Maximize2, Minimize2, Trash2, Database, Wifi, Send, RefreshCw, Info, Play } from 'lucide-react';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'storage' | 'socket'>('logs');
  const [storageData, setStorageData] = useState<Record<string, any>>({});
  const [socketStatus, setSocketStatus] = useState<{
    exists: boolean;
    connected: boolean;
    url: string;
  }>({ exists: false, connected: false, url: '' });
  const chatState = useChatStore();
  const { authState } = useAuth();
  
  // Set default to false to start minimized
  const [isVisible, setIsVisible] = useState(() => {
    // Try to get the stored preference, default to false (minimized)
    const stored = localStorage.getItem('log-viewer-visible');
    return stored ? JSON.parse(stored) : false;
  });
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Save visibility preference
    localStorage.getItem('log-viewer-visible');
    localStorage.setItem('log-viewer-visible', JSON.stringify(isVisible));
  }, [isVisible]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isVisible) {
        setLogs(logger.getLogHistory());
        
        if (activeTab === 'storage') {
          // Get all storage data
          const data: Record<string, any> = {};
          // Get localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              try {
                const value = localStorage.getItem(key);
                data[key] = value ? JSON.parse(value) : null;
              } catch (e) {
                data[key] = localStorage.getItem(key);
              }
            }
          }
          
          // Add chat store state
          data['__chatState'] = {
            chats: chatState.chats,
            messagesCount: Object.keys(chatState.messages).reduce(
              (acc, chatId) => acc + chatState.messages[chatId].length, 0
            ),
            messageChatIds: Object.keys(chatState.messages)
          };
          
          // Add current user if available
          if (chatState.currentUser) {
            data['__chatState'].currentUser = chatState.currentUser;
          }
          
          setStorageData(data);
        }
        
        if (activeTab === 'socket') {
          // Update socket status
          try {
            const socketInfo = ChatService.getSocketInfo();
            const isConnected = ChatService.isSocketConnected();
            
            setSocketStatus({
              exists: socketInfo.socketExists,
              connected: isConnected,
              url: socketInfo.socketUrl
            });
          } catch (error) {
            logger.error('Error getting socket info in LogViewer:', error);
          }
        }
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isVisible, activeTab, chatState]);

  // Determine container classes based on maximized state
  const containerClasses = isMaximized 
    ? 'fixed inset-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50'
    : 'fixed bottom-4 right-4 w-96 h-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50';

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg cursor-pointer z-50 hover:bg-blue-600 transition-colors"
        onClick={() => setIsVisible(true)}
        title="Show Logs"
      >
        📋
      </div>
    );
  }
  
  return (
    <div className={containerClasses}>
      <div className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-900">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-2 py-1 rounded ${
              activeTab === 'logs' 
                ? 'bg-blue-500 text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Logs
          </button>
          <button 
            onClick={() => setActiveTab('storage')}
            className={`px-2 py-1 rounded flex items-center gap-1 ${
              activeTab === 'storage' 
                ? 'bg-blue-500 text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Database className="w-3 h-3" /> Storage
          </button>
          <button 
            onClick={() => setActiveTab('socket')}
            className={`px-2 py-1 rounded flex items-center gap-1 ${
              activeTab === 'socket' 
                ? 'bg-blue-500 text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Wifi className="w-3 h-3" /> Socket
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsMaximized(!isMaximized)} 
            title={isMaximized ? 'Minimize' : 'Maximize'}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {activeTab === 'logs' && (
            <button 
              onClick={() => { logger.clearLogHistory(); setLogs([]); }} 
              title="Clear Logs"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setIsVisible(false)} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {activeTab === 'logs' && (
        <div className="flex-1 overflow-auto p-2 text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 italic">No logs yet</div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index}
                className={`mb-1 p-1 rounded ${
                  log.level === 'error'
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : log.level === 'debug'
                    ? 'bg-blue-100 dark:bg-blue-900/20'
                    : 'bg-green-100 dark:bg-green-900/20'
                }`}
              >
                <div className="font-mono">
                  <span className="opacity-50 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`ml-1 font-bold ${
                    log.level === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : log.level === 'debug'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    [{log.level}]
                  </span>
                  <span className="ml-1">{log.message}</span>
                </div>
                {log.args.length > 0 && (
                  <div className="ml-4 font-mono opacity-75 overflow-x-auto whitespace-pre-wrap">
                    {log.args.join(' ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {activeTab === 'storage' && (
        <div className="flex-1 overflow-auto p-2 text-xs">
          <div className="font-mono">
            {Object.keys(storageData).map(key => (
              <div key={key} className="mb-4">
                <div className="font-bold text-blue-600 dark:text-blue-400">{key}</div>
                <pre className="ml-2 p-1 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                  {typeof storageData[key] === 'object' 
                    ? JSON.stringify(storageData[key], null, 2)
                    : storageData[key]}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'socket' && (
        <div className="flex-1 overflow-auto p-2 text-xs">
          <div className="flex flex-col gap-3">
            {/* Socket Status */}
            <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
              <div className="font-bold mb-1">Socket Status</div>
              <div className="grid grid-cols-2 gap-1">
                <div>Socket Exists:</div>
                <div className={socketStatus.exists ? "text-green-600" : "text-red-600"}>
                  {socketStatus.exists ? "Yes" : "No"}
                </div>
                <div>Connected:</div>
                <div className={socketStatus.connected ? "text-green-600" : "text-red-600"}>
                  {socketStatus.connected ? "Yes" : "No"}
                </div>
                <div>URL:</div>
                <div className="truncate">{socketStatus.url}</div>
              </div>
            </div>
            
            {/* Socket Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  try {
                    logger.info('Manually reconnecting to Socket.IO server');
                    ChatService.reconnect();
                    toast.success('Socket reconnect attempted');
                  } catch (error) {
                    logger.error('Error during manual socket reconnection:', error);
                    toast.error('Failed to reconnect socket');
                  }
                }}
                className="p-2 rounded bg-blue-200 text-blue-800 hover:bg-blue-300 flex items-center justify-center"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Reconnect Socket
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const status = await ChatService.checkSocketServerStatus();
                    if (status.running) {
                      toast.success(`Socket server is running at ${status.url}`);
                    } else {
                      toast.error(`Socket server is NOT running at ${status.url}`);
                    }
                    logger.info('Socket server status check:', status);
                  } catch (error) {
                    logger.error('Error checking socket server:', error);
                    toast.error('Failed to check socket server status');
                  }
                }}
                className="p-2 rounded bg-green-200 text-green-800 hover:bg-green-300 flex items-center justify-center"
              >
                <Info className="w-3 h-3 mr-1" /> Check Socket
              </button>
              
              <button
                onClick={async () => {
                  try {
                    // Get current chat from chat store if it exists
                    // This circumvents TypeScript errors by not assuming it's a property of the store
                    const currentUser = authState.currentUser;
                    const currentUserChat = currentUser?.studentId ? 
                      chatState.chats.find(c => c.participants.includes(currentUser.studentId)) : 
                      null;
                    
                    if (!currentUserChat || !currentUser) {
                      toast.error('No current chat or user found');
                      return;
                    }
                    
                    const testMsg = `Test message ${Date.now()}`;
                    logger.info('Sending test message:', testMsg);
                    await ChatService.sendMessage(
                      currentUserChat.id, 
                      currentUser.studentId, 
                      testMsg
                    );
                    toast.success('Test message sent');
                  } catch (error) {
                    logger.error('Error sending test message:', error);
                    toast.error('Failed to send test message');
                  }
                }}
                className="p-2 rounded bg-yellow-200 text-yellow-800 hover:bg-yellow-300 flex items-center justify-center"
              >
                <Send className="w-3 h-3 mr-1" /> Test Message
              </button>
              
              <button
                onClick={() => {
                  try {
                    const socketInfo = ChatService.getSocketInfo();
                    const isConnected = ChatService.isSocketConnected();
                    
                    logger.info('Socket info:', { ...socketInfo, isConnected });
                    
                    toast.success(
                      `Socket exists: ${socketInfo.socketExists}\n` +
                      `Socket connected: ${isConnected}\n` +
                      `URL: ${socketInfo.socketUrl}`
                    );
                  } catch (error) {
                    logger.error('Error getting socket info:', error);
                    toast.error('Failed to get socket info');
                  }
                }}
                className="p-2 rounded bg-purple-200 text-purple-800 hover:bg-purple-300 flex items-center justify-center"
              >
                <Info className="w-3 h-3 mr-1" /> Socket Info
              </button>
              
              <button
                onClick={async () => {
                  try {
                    toast.loading('Starting chat server...');
                    
                    const startServerCommand = 'cd chat-server && npm start';
                    logger.info('Trying to start chat server with command:', startServerCommand);
                    
                    // This is just a notification since we can't execute the command directly
                    // from the client browser for security reasons
                    setTimeout(() => {
                      toast.dismiss();
                      toast.success(
                        'Please run this command in your terminal to start the chat server:\n\n' +
                        startServerCommand
                      );
                    }, 1500);
                  } catch (error) {
                    logger.error('Error starting chat server:', error);
                    toast.error('Failed to start chat server');
                  }
                }}
                className="p-2 rounded bg-red-200 text-red-800 hover:bg-red-300 flex items-center justify-center col-span-2"
              >
                <Play className="w-3 h-3 mr-1" /> Start Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
