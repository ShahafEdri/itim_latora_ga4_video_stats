WITH daily_watch AS (
  SELECT
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
    SUM(CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = "seconds_watched") AS INT64)) / 3600.0 AS total_hours_watched
  FROM
    `indigo-listener-354617.analytics_481145260.events_*`
  WHERE
    event_name = 'video_watch_time'
    AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
                          AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  GROUP BY
    event_date
),

smoothed AS (
  SELECT
    event_date,
    total_hours_watched,
    ROUND(AVG(total_hours_watched) OVER (
      ORDER BY event_date
      ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    ), 2) AS smoothed_hours
  FROM daily_watch
)

SELECT * FROM smoothed
ORDER BY event_date;
