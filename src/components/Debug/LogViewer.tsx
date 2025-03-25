import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { X, Maximize2, Minimize2, Trash2 } from 'lucide-react';

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  // set default to true to show logs immediately
  const [isVisible, setIsVisible] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false); // new state for maximize

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isVisible) {
        setLogs(logger.getLogHistory());
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isVisible]);

  // Determine container classes based on maximized state
  const containerClasses = isMaximized 
    ? 'fixed inset-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50'
    : 'fixed bottom-4 right-4 w-96 h-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col z-50';

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg cursor-pointer z-50"
        onClick={() => setIsVisible(true)}
      >
        📋
      </div>
    );
  }
  
  return (
    <div className={containerClasses}>
      <div className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-900">
        <h3 className="font-bold">Application Logs</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsMaximized(!isMaximized)} 
            title={isMaximized ? 'Minimize' : 'Maximize'}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {/* New Clear Logs Button */}
          <button 
            onClick={() => { logger.clearLogHistory(); setLogs([]); }} 
            title="Clear Logs"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsVisible(false)} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
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
    </div>
  );
};
