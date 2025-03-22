import { Smartphone, Monitor, LaptopIcon } from 'lucide-react';
import { useThemeStore } from '../store/theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { useEffect } from 'react';

export function DeviceToggle() {
  const { device, setDevice, initDeviceDetection } = useThemeStore();
  
  // Initialize device detection on component mount
  useEffect(() => {
    initDeviceDetection();
  }, [initDeviceDetection]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {device === 'desktop' ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle device</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDevice('desktop')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>Desktop</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDevice('mobile')}>
          <Smartphone className="mr-2 h-4 w-4" />
          <span>Mobile</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}