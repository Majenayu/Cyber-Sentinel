import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { usePushNotifications, type PushStatus } from '@/hooks/usePushNotifications';
import { useState } from 'react';

interface PushBellProps {
  active: boolean;
  /** compact = icon only (mobile header), full = icon + label + test btn (sidebar) */
  variant?: 'compact' | 'full';
}

function statusMeta(s: PushStatus): { icon: React.ElementType; color: string; tip: string } {
  switch (s) {
    case 'subscribed':
      return { icon: BellRing, color: 'text-green-400', tip: 'Alerts ON — tap to test' };
    case 'denied':
      return { icon: BellOff, color: 'text-red-500', tip: 'Notifications blocked in browser settings' };
    case 'unsupported':
      return { icon: BellOff, color: 'text-zinc-600', tip: 'Push not supported on this browser' };
    case 'requesting':
      return { icon: Loader2, color: 'text-yellow-400 animate-spin', tip: 'Enabling…' };
    case 'error':
      return { icon: Bell, color: 'text-orange-400', tip: 'Error — tap to retry' };
    default: // idle
      return { icon: Bell, color: 'text-muted-foreground', tip: 'Tap to enable intrusion alerts' };
  }
}

export function PushBell({ active, variant = 'compact' }: PushBellProps) {
  const { status, testResult, subscribe, sendTest } = usePushNotifications(active);
  const [showTip, setShowTip] = useState(false);
  const meta = statusMeta(status);
  const Icon = meta.icon;

  const handleClick = () => {
    if (status === 'subscribed') {
      sendTest();
    } else if (status !== 'denied' && status !== 'unsupported' && status !== 'requesting') {
      subscribe();
    } else {
      setShowTip(t => !t);
    }
  };

  if (variant === 'full') {
    return (
      <div className="px-3 py-2 border-t border-border mt-auto">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={handleClick}
            title={meta.tip}
            className={`flex items-center gap-2 text-xs font-mono transition-colors ${meta.color} hover:opacity-80`}
          >
            <Icon size={14} />
            <span>
              {status === 'subscribed' ? 'Alerts active' :
               status === 'denied' ? 'Alerts blocked' :
               status === 'unsupported' ? 'Not supported' :
               status === 'requesting' ? 'Enabling…' :
               status === 'error' ? 'Retry alerts' :
               'Enable alerts'}
            </span>
          </button>
          {status === 'subscribed' && (
            <button
              onClick={sendTest}
              className="ml-auto text-[10px] font-mono text-muted-foreground hover:text-primary border border-border hover:border-primary/50 px-1.5 py-0.5 rounded transition-colors"
            >
              test
            </button>
          )}
        </div>
        {testResult && (
          <p className="text-[10px] font-mono text-muted-foreground pl-5">{testResult}</p>
        )}
      </div>
    );
  }

  // compact — icon only for the mobile top bar
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        title={meta.tip}
        className={`p-2 rounded border border-border hover:border-primary/50 transition-colors ${meta.color}`}
      >
        <Icon size={18} />
        {status === 'subscribed' && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
        {(status === 'idle' || status === 'error') && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        )}
      </button>
      {testResult && (
        <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground whitespace-nowrap shadow-lg">
          {testResult}
        </div>
      )}
    </div>
  );
}
