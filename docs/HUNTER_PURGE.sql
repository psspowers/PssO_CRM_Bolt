-- Delete "Boring" and "No Data" entries
DELETE FROM market_news
WHERE impact_type = 'neutral'
AND (
  -- The "Failure" patterns
  title ILIKE '%no data%' OR title ILIKE '%not found%' OR title ILIKE '%unclear%' OR
  title ILIKE '%no public%' OR title ILIKE '%limited%' OR title ILIKE '%absent%' OR

  -- The "Boring Description" patterns (Directory style)
  title ILIKE '%operates%' OR title ILIKE '%located in%' OR title ILIKE '%manufacturer of%' OR
  title ILIKE '%provider of%' OR title ILIKE '%focuses on%' OR

  -- The specific user complaints
  title ILIKE '%no clear%' OR title ILIKE '%without energy%' OR title ILIKE '%duplicate%' OR
  summary ILIKE '%minimal or unavailable%' OR summary ILIKE '%data limitations%' OR
  summary ILIKE '%not widely reported%'
);
