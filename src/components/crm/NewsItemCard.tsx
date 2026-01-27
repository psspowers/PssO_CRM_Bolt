import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Info, ExternalLink, Star, Trash2, Zap, Target, ChevronDown, ChevronUp, Calculator, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
    confidence_score?: number;
    inferred_mw?: number;
    calculation_logic?: string;
    rapport_hook?: string;
    sales_script?: string;
  };
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onHide?: (id: string) => void;
  onClaim?: (id: string) => void;
  onStartChain?: (news: any) => void;
  compact?: boolean;
  claimInfo?: {
    claimed_by_name: string;
    claimed_by_avatar?: string;
    assigned_to_name?: string;
  } | null;
}

export const NewsItemCard: React.FC<NewsItemCardProps> = ({
  news,
  isFavorited = false,
  onToggleFavorite,
  onHide,
  onClaim,
  onStartChain,
  compact = false,
  claimInfo = null
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tacticsOpen, setTacticsOpen] = useState(false);

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'opportunity':
        return (
          <div className="bg-emerald-100 p-1.5 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
        );
      case 'threat':
        return (
          <div className="bg-red-100 p-1.5 rounded-lg">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 p-1.5 rounded-lg">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
        );
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'opportunity': return 'Opportunity';
      case 'threat': return 'Threat';
      default: return 'Market Info';
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' };
    if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400' };
    if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400' };
    return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' };
  };

  return (
    <div className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0 mt-0.5">
                {getImpactIcon(news.impact_type)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-semibold">{getImpactLabel(news.impact_type)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
          {news.confidence_score !== undefined && news.confidence_score > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${getConfidenceColor(news.confidence_score).bg} ${getConfidenceColor(news.confidence_score).text} ${getConfidenceColor(news.confidence_score).border}`}
                  >
                    {news.confidence_score}% Confidence
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">AI Confidence Score</p>
                  <p className="text-xs">High scores indicate hard data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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

        {news.inferred_mw !== undefined && news.inferred_mw > 0 && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-orange-900">
                  Solar Potential: ~{news.inferred_mw.toFixed(2)} MW
                </div>
                {news.calculation_logic && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-orange-700 mt-1 cursor-help flex items-center gap-1">
                          <Calculator className="w-3 h-3" />
                          Show Math
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">{news.calculation_logic}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
        )}

        {(news.rapport_hook || news.sales_script) && (
          <div className="mt-3">
            <button
              onClick={() => setTacticsOpen(!tacticsOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-orange-600 transition-colors"
            >
              {tacticsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Reveal Tactics
            </button>
            {tacticsOpen && (
              <div className="mt-2 space-y-2">
                {news.rapport_hook && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs font-bold text-blue-900 mb-1">🤝 Rapport Hook</div>
                    <p className="text-xs text-blue-800">{news.rapport_hook}</p>
                  </div>
                )}
                {news.sales_script && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-xs font-bold text-purple-900 mb-1">🎯 Sales Script</div>
                    <p className="text-xs text-purple-800">{news.sales_script}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        {claimInfo ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-300 rounded-lg">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={claimInfo.claimed_by_avatar} />
                    <AvatarFallback className="text-xs bg-orange-200 text-orange-800">
                      {claimInfo.claimed_by_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-orange-800">
                    Claimed by {claimInfo.claimed_by_name}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">This intel is claimed</p>
                {claimInfo.assigned_to_name && (
                  <p className="text-xs">Assigned to: {claimInfo.assigned_to_name}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          onClaim && (
            <Button
              onClick={() => onClaim(news.id)}
              size="sm"
              variant="outline"
              className="text-xs font-semibold border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
            >
              <Target className="w-3 h-3 mr-1" />
              Claim Deal (+15⚡)
            </Button>
          )
        )}

        {onStartChain && news.inferred_mw && news.inferred_mw > 0 && (
          <Button
            onClick={() => onStartChain(news)}
            size="sm"
            variant="outline"
            className="text-xs font-semibold border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
          >
            <Zap className="w-3 h-3 mr-1" />
            Start Chain
          </Button>
        )}

        {news.url && (
          <button
            onClick={() => window.open(news.url!, '_blank')}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Source
          </button>
        )}

        <div className="flex-1" />

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
