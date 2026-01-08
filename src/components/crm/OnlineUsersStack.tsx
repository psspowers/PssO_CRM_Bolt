import { usePresence } from '@/contexts/PresenceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const OnlineUsersStack = () => {
  const { onlineUsers } = usePresence();
  const { user } = useAuth();

  const otherUsers = onlineUsers.filter(u => u.userId !== user?.id);
  const displayUsers = otherUsers.slice(0, 4);
  const remainingCount = otherUsers.length - 4;

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {displayUsers.map((onlineUser) => (
          <Tooltip key={onlineUser.userId}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="w-8 h-8 border-2 border-white ring-1 ring-slate-100 hover:scale-110 transition-transform cursor-pointer">
                  <AvatarImage src={onlineUser.avatar} alt={onlineUser.name} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                    {onlineUser.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{onlineUser.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100 bg-slate-200 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <span className="text-xs font-bold text-slate-600">+{remainingCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{remainingCount} more online</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
