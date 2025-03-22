import { Smartphone, Monitor } from 'lucide-react';
import { useThemeStore } from '../store/theme';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export function DeviceToggle() {
  const { device, setDevice } = useThemeStore();

  return (
    <div className="flex items-center space-x-2">
      <Smartphone className="h-4 w-4" />
      <Switch
        id="device-mode"
        checked={device === 'desktop'}
        onCheckedChange={(checked) => setDevice(checked ? 'desktop' : 'mobile')}
      />
      <Label htmlFor="device-mode">
        <Monitor className="h-4 w-4" />
      </Label>
    </div>
  );
}