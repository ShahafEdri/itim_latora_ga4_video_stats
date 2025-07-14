WITH progress_events AS (
  SELECT
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "video_title") AS video_title,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "progress") AS progress
  FROM
    `indigo-listener-354617.analytics_481145260.events_*`
  WHERE
    event_name = 'video_progress'
    AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
                          AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
),

complete_events AS (
  SELECT
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "video_title") AS video_title
  FROM
    `indigo-listener-354617.analytics_481145260.events_*`
  WHERE
    event_name = 'video_complete'
    AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
                          AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
)

SELECT
  COALESCE(p.video_title, c.video_title) AS video_title,
  COALESCE(p.event_date, c.event_date) AS event_date,
  COUNT(DISTINCT IF(progress = '25%', p.user_pseudo_id, NULL)) AS users_25_percent,
  COUNT(DISTINCT IF(progress = '50%', p.user_pseudo_id, NULL)) AS users_50_percent,
  COUNT(DISTINCT IF(progress = '75%', p.user_pseudo_id, NULL)) AS users_75_percent,
  COUNT(DISTINCT IF(progress = '90%', p.user_pseudo_id, NULL)) AS users_90_percent,
  COUNT(DISTINCT c.user_pseudo_id) AS users_100_percent
FROM
  progress_events p
FULL OUTER JOIN
  complete_events c
ON
  p.video_title = c.video_title AND p.user_pseudo_id = c.user_pseudo_id
GROUP BY
  event_date, video_title
ORDER BY
  event_date DESC, users_100_percent DESC;
