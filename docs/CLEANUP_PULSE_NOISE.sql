DELETE FROM market_news
WHERE impact_type = 'neutral'
AND (
  title ILIKE '%not found%' OR title ILIKE '%no data%' OR title ILIKE '%unclear%' OR
  summary ILIKE '%minimal%' OR summary ILIKE '%absent%' OR summary ILIKE '%data gaps%'
);
