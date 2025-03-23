import { User, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export function ProfileToggle() {
  const { authState, logout, switchProfile } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleSwitchProfile = () => {
    switchProfile({
      keepEmail: true,
      redirectToLogin: true
    });
    navigate('/login');
  };
    const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((part) => part.charAt(0))
        .join('');
    };
  if (authState.loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="w-5 h-5" /> {authState.currentUser ? getInitials(authState.currentUser.name) : 'U'}
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSwitchProfile}>
          <span>Switch Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
