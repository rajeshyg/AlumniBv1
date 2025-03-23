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

export function ProfileToggle() {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
 
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
 
  const handleSwitchProfile = async () => {
    // Get all profiles for the current user's email
    const currentEmail = authState.currentUser?.email;
    if (currentEmail) {
      // This should return all profiles associated with the email
      const result = await UserService.login(currentEmail, 'test');
      if (result.success && result.users) {
        // Navigate to login form with profiles for selection
        navigate('/login', { 
          state: { 
            switchProfile: true,
            profiles: result.users
          }
        });
      }
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