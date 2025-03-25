import { User, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/UserService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';

export function ProfileToggle() {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
 
  const handleLogout = () => {
    logger.info('User logging out', { 
      userId: authState.currentUser?.studentId,
      email: authState.currentUser?.email 
    });
    logout();
    navigate('/login');
  };
 
  const handleSwitchProfile = async () => {
    const currentEmail = authState.currentUser?.email;
    if (currentEmail) {
      try {
        logger.info('User requesting profile switch', { email: currentEmail });
        const result = await UserService.login(currentEmail, 'test');
        
        if (result.success && result.users) {
          logger.info('Multiple profiles found for user', { 
            email: currentEmail,
            profileCount: result.users.length
          });
          
          // Ensure navigation happens after the successful API call
          navigate('/login', { 
            state: { 
              switchProfile: true,
              profiles: result.users
            }
          });
        } else {
          logger.error('Profile switch failed', { 
            email: currentEmail,
            reason: result.message || 'Unknown error' 
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error("Profile switch error", { 
          email: currentEmail,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    } else {
      logger.error("Cannot switch profile - no email available");
    }
  };
 
  if (authState.loading) return null;
 
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="w-5 h-5" />
          {authState.currentUser ? authState.currentUser.name.split(' ')[0] : 'U'}
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSwitchProfile}>
          <UserCheck className="mr-2 h-4 w-4" />
          <span>Switch Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}