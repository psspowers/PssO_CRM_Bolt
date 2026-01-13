import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface NewsItemCardProps {
  news: {
    id: string;
    title: string;
    summary: string | null;
    url: string | null;
    impact_type: 'opportunity' | 'threat' | 'neutral';
    news_date?: string;
    created_at: string;
    account_name?: string;
    creator_name?: string;
  };
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onHide?: (id: string) => void;
  compact?: boolean;
}

export const NewsItemCard: React.FC<NewsItemCardProps> = ({
  news,
  isFavorited = false,
  onToggleFavorite,
  onHide,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false);

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'threat': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-shrink-0 mt-1">
          {getImpactIcon(news.impact_type)}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {news.creator_name && (
            <>
              <span className="font-bold text-slate-900 text-sm">
                {news.creator_name}
              </span>
              <span className="text-slate-500 text-sm">·</span>
            </>
          )}
          <span className="text-slate-500 text-sm">
            {news.news_date
              ? new Date(news.news_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}
          </span>
          <Badge
            variant="outline"
            className={`text-xs ${
              news.impact_type === 'opportunity'
                ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                : news.impact_type === 'threat'
                ? 'border-red-400 text-red-700 bg-red-50'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            {news.impact_type}
          </Badge>
        </div>
      </div>

      <div className="mt-2">
        <h3 className="font-bold text-base text-slate-900 leading-snug mb-2">
          {news.title}
        </h3>

        {news.summary && (
          <div className="relative">
            <p className={`text-sm text-slate-600 leading-relaxed ${expanded || compact ? '' : 'line-clamp-3'}`}>
              {news.summary}
            </p>
            {!compact && (news.summary?.length || 0) > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-bold text-orange-600 mt-1 hover:underline"
              >
                {expanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        )}

        {news.account_name && (
          <div className="text-xs text-slate-600 mt-2">
            Related: <span className="font-semibold">{news.account_name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
        {news.url && (
          <button
            onClick={() => window.open(news.url!, '_blank')}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors mr-2"
          >
            <ExternalLink className="w-3 h-3" />
            Source
          </button>
        )}

        <TooltipProvider>
          {onToggleFavorite && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggleFavorite(news.id)}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorited
                      ? 'text-yellow-500 bg-yellow-50'
                      : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Save</TooltipContent>
            </Tooltip>
          )}

          {onHide && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onHide(news.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Hide</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
};
