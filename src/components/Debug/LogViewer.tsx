import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { X, Maximize2, Minimize2, Trash2, Database } from 'lucide-react';
import { useChatStore } from '../../store/chat';

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'storage'>('logs');
  const [storageData, setStorageData] = useState<Record<string, any>>({});
  const chatState = useChatStore();
  
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
            currentChat: chatState.currentChat,
            currentUser: chatState.currentUser,
            messagesCount: Object.keys(chatState.messages).reduce(
              (acc, chatId) => acc + chatState.messages[chatId].length, 0
            ),
            messageChatIds: Object.keys(chatState.messages)
          };
          
          setStorageData(data);
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
    </div>
  );
};
