WITH audio_events AS (
  SELECT
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "audio_title") AS audio_title,
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = "seconds_watched") AS INT64) AS seconds_watched,
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = "audio_duration") AS INT64) AS audio_duration,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "page_location") AS page_url
  FROM `indigo-listener-354617.analytics_481145260.events_*`
  WHERE
    event_name = 'audio_watch_time'
    AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR))
                        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    AND (SELECT value.int_value FROM UNNEST(event_params) WHERE key = "seconds_watched") IS NOT NULL
),

user_audio_watch AS (
  SELECT
    event_date,
    audio_title,
    page_url,
    user_pseudo_id,
    SUM(seconds_watched) AS total_seconds_watched,
    MAX(audio_duration) AS audio_duration
  FROM audio_events
  GROUP BY event_date, audio_title, page_url, user_pseudo_id
)

SELECT
  event_date,
  audio_title,
  ROUND(SUM(total_seconds_watched) / 3600.0, 1) AS total_hours_watch_time,
  COUNT(DISTINCT user_pseudo_id) AS distinct_user_id,
  ROUND(SUM(total_seconds_watched) / COUNT(DISTINCT user_pseudo_id) / 60.0, 2) AS avg_minutes_watch_time,
  ROUND(AVG(total_seconds_watched * 1.0 / audio_duration) * 100, 1) AS completion_rate,
  ROUND(APPROX_QUANTILES(total_seconds_watched, 2)[OFFSET(1)] / 60.0, 1) AS median_minutes_watch_time,
  ROUND(AVG(audio_duration) / 60.0, 1) AS audio_duration_minutes,
  page_url
FROM user_audio_watch
GROUP BY event_date, audio_title, page_url
ORDER BY event_date DESC, total_hours_watch_time DESC;
