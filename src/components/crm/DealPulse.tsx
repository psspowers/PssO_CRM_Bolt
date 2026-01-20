import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { NewsItemCard } from "./NewsItemCard";
import { Newspaper, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  impact_type: "opportunity" | "threat" | "neutral";
  news_date: string | null;
  created_at: string;
  created_by: string;
  creator?: {
    name: string;
  };
}

interface DealPulseProps {
  accountId: string | null | undefined;
}

export function DealPulse({ accountId }: DealPulseProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (accountId) {
      fetchNews();
      fetchFavorites();
    } else {
      setLoading(false);
    }
  }, [accountId]);

  const fetchNews = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("market_news")
        .select(
          `
          id,
          title,
          summary,
          url,
          impact_type,
          news_date,
          created_at,
          created_by,
          creator:crm_users!market_news_created_by_fkey(name)
        `
        )
        .eq("related_account_id", accountId)
        .order("news_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error: any) {
      console.error("Error fetching news:", error);
      toast.error("Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("market_news_interactions")
        .select("news_id")
        .eq("user_id", user.id)
        .eq("is_favorite", true);

      if (error) throw error;

      setFavorites(new Set(data?.map((item) => item.news_id) || []));
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
    }
  };

  const handleToggleFavorite = async (newsId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isFavorited = favorites.has(newsId);

      if (isFavorited) {
        const { error } = await supabase
          .from("market_news_interactions")
          .delete()
          .eq("news_id", newsId)
          .eq("user_id", user.id);

        if (error) throw error;

        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(newsId);
          return newSet;
        });
        toast.success("Removed from favorites");
      } else {
        const { error } = await supabase.from("market_news_interactions").insert({
          news_id: newsId,
          user_id: user.id,
          is_favorite: true,
        });

        if (error) throw error;

        setFavorites((prev) => new Set(prev).add(newsId));
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const handleHide = async (newsId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("market_news_interactions")
        .upsert(
          {
            news_id: newsId,
            user_id: user.id,
            is_hidden: true,
          },
          {
            onConflict: "news_id,user_id",
          }
        );

      if (error) throw error;

      setNews((prev) => prev.filter((item) => item.id !== newsId));
      toast.success("News hidden");
    } catch (error: any) {
      console.error("Error hiding news:", error);
      toast.error("Failed to hide news");
    }
  };

  if (!accountId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Newspaper className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          No linked account
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Market intelligence is tracked at the account level
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Newspaper className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          No market intelligence yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Add news from the Pulse screen to track market developments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 divide-y divide-border">
      {news.map((item) => (
        <NewsItemCard
          key={item.id}
          news={{
            id: item.id,
            title: item.title,
            summary: item.summary,
            url: item.url,
            impact_type: item.impact_type,
            news_date: item.news_date || undefined,
            created_at: item.created_at,
            creator_name: item.creator?.name,
          }}
          isFavorited={favorites.has(item.id)}
          onToggleFavorite={handleToggleFavorite}
          onHide={handleHide}
          compact={false}
        />
      ))}
    </div>
  );
}
