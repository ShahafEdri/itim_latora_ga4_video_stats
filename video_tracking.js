//video_tracking.js

document.addEventListener('DOMContentLoaded', function () {
  /**
   * Sets up tracking for a given media element (video or audio).
   * It tracks play, pause, progress milestones, completion, and importantly,
   * cumulative watch time with periodic updates.
   *
   * @param {HTMLMediaElement} mediaElement The video or audio HTML element.
   * @param {string} type The type of media ('video' or 'audio').
   */

  function setupMediaTracking(mediaElement, type) {
    // Determine the title of the media from its source or use a default.
    const sourceElement = mediaElement.querySelector('source');
    const src = sourceElement?.src || mediaElement.currentSrc;
    const rawFileName = src ? decodeURIComponent(src.split('/').pop().split('.')[0]) : `שיעור ללא שם`;
    const title = rawFileName.replace(/[-_]/g, ' ');

    // Milestones for progress tracking (e.g., 25%, 50%, 75%, 90%, 100%).
    const milestones = { 25: false, 50: false, 75: false, 90: false, 100: false };
    let watchTime = 0; // Cumulative watch time in seconds.
    let interval; // Interval for incrementing watchTime every second.
    let periodicWatchTimeSendInterval; // Interval for sending gtag events periodically.
    const SEND_INTERVAL_SECONDS = 10; // Define how often to send periodic watch time updates (e.g., every 10 seconds).


    // Function to send the watch time event reliably
    function sendWatchTimeEvent(trigger) {
      if (watchTime > 0) {
        // Use navigator.sendBeacon for reliable sending on page dismissal
        // gtag typically uses sendBeacon internally for its default sends,
        // but for manual triggers on page hide/unload, it's good to be explicit
        // if not relying purely on gtag's internal queueing.

        // For gtag, you generally just call gtag event as usual, and it will
        // queue it using sendBeacon if supported and appropriate for the context.
        gtag('event', `${type}_watch_time`, {
          [`${type}_title`]: title,
          seconds_watched: watchTime,
          duration: Math.floor(mediaElement.duration),
          event_trigger: trigger // Indicate the trigger (e.g., 'visibility_hidden', 'pagehide')
        });

        // Reset watchTime after sending to avoid duplicate sends of the same value
        // if multiple exit/pause events fire without new watch time accumulating.
        watchTime = 0;
      }
    }



    // Event listener for when the media starts playing.
    mediaElement.addEventListener('play', () => {
      // Send a 'play' event to GA4.
      gtag('event', `${type}_play`, { [`${type}_title`]: title });

      // Start the 1-second watchTime increment interval if not already running.
      if (!interval) {
        interval = setInterval(() => {
          if (!mediaElement.paused && !mediaElement.ended) {
            watchTime += 1;
          }
        }, 1000); // Increments watchTime every 1 second.  
      }

      // Start the periodic watch time event send interval if not already running.
      // This ensures watch time data is sent regularly while playing.
      if (!periodicWatchTimeSendInterval) {
        periodicWatchTimeSendInterval = setInterval(() => {
          if (!mediaElement.paused && !mediaElement.ended) {
            // Send a periodic watch time update event to GA4.
            // This event captures the cumulative watch time at regular intervals.
            gtag('event', `${type}_watch_time_update`, {
              [`${type}_title`]: title,
              seconds_watched: watchTime, // Cumulative watch time.
              duration: Math.floor(mediaElement.duration), // Total duration of the media.
              interval_seconds: SEND_INTERVAL_SECONDS // Context for analysis.
            });
          }
        }, SEND_INTERVAL_SECONDS * 1000); // Converts seconds to milliseconds for setInterval.  
      }
    });

    // Event listener for when the media is paused.
    mediaElement.addEventListener('pause', () => {
      // Send a 'pause' event to GA4.
      gtag('event', `${type}_pause`, {
        [`${type}_title`]: title,
        current_time: Math.floor(mediaElement.currentTime)
      });

      // Clear both intervals to stop tracking when paused.
      clearInterval(interval);
      clearInterval(periodicWatchTimeSendInterval);
      interval = null;
      periodicWatchTimeSendInterval = null;

      // Send the final watch time on pause, if any time has been accumulated.
      // This ensures data is captured at natural interaction points.
      sendWatchTimeEvent('pause');
    });

    // Event listener for time updates (used for progress milestones).
    mediaElement.addEventListener('timeupdate', () => {
      const percent = (mediaElement.currentTime / mediaElement.duration) * 100;
      // Iterate over the defined milestones.
      Object.keys(milestones).forEach(milestoneKey => {
        const milestone = parseInt(milestoneKey); // Convert string key to number for comparison.

        // If a milestone is reached and not yet tracked, send a progress event.
        if (percent >= milestone && !milestones[milestoneKey]) {
          gtag('event', `${type}_progress`, {
            [`${type}_title`]: title,
            progress: milestone + '%' // E.g., "25%".
          });
          milestones[milestoneKey] = true; // Mark as true to prevent re-tracking.
        }
      });
    });



    // Event listener for when the media ends.
    mediaElement.addEventListener('ended', () => {
      // Send a 'complete' event to GA4.
      gtag('event', `${type}_complete`, { [`${type}_title`]: title });

      // Clear both intervals when media ends.
      clearInterval(interval);
      clearInterval(periodicWatchTimeSendInterval);
      interval = null;
      periodicWatchTimeSendInterval = null;

      // Send the final watch time on completion.
      sendWatchTimeEvent('ended');

    });

    // Event listener for when the window is about to be unloaded (e.g., tab closed, navigated away).
    window.addEventListener('beforeunload', () => {
      // This serves as a last-ditch effort to send watch time if the user
      // closes the tab without pausing or letting the media end.
      // GA4 typically handles these events gracefully.
      sendWatchTimeEvent('beforeunload');
      // The watchTime = 0; was here, but moved into sendWatchTimeEvent for better consistency.
      // It's still fine to have it here if sendWatchTimeEvent doesn't reset it,
      // but resetting within sendWatchTimeEvent is generally cleaner.
    });

    // --- Event Listeners for Reliable Data Collection ---

    // 1. Primary: visibilitychange event
    // This fires when the user switches tabs, minimizes the browser, or goes to home screen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden, send current watch time
        sendWatchTimeEvent('visibility_hidden');
      }
      // If you need to do something when it becomes visible again:
      else if (document.visibilityState === 'visible') {
        //   // Page is visible again, resume tracking if needed
      }
    });

    // 2. Fallback/Final: pagehide event (part of Page Lifecycle API)
    // This fires when the user navigates away, even if the page is put in bfcache.
    // It's more reliable than 'beforeunload' or 'unload'.
    window.addEventListener('pagehide', () => {
      // Page is being hidden or unloaded, send final watch time
      sendWatchTimeEvent('pagehide');
    });

  }

  // Initialize tracking for all video and audio elements on the page.
  document.querySelectorAll('video').forEach(el => setupMediaTracking(el, 'video'));
  document.querySelectorAll('audio').forEach(el => setupMediaTracking(el, 'audio'));
});
