//video_tracking.js

function getAnonymousUserId() {
  const key = 'itim_latora_anon_user_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'anon-' + crypto.randomUUID(); // Or use Date.now() + Math.random() if older browser
    localStorage.setItem(key, id);
  }
  return id;
}

// {% if request.user.is_authenticated %}
//   const userId = "{{ request.user.id }}";
// {% else %}
  const userId = getAnonymousUserId();
// {% endif %}

gtag('set', { custom_user_id: userId });

document.addEventListener('DOMContentLoaded', function () {
  function setupMediaTracking(mediaElement, type) {
    const sourceElement = mediaElement.querySelector('source');
    const src = sourceElement?.src || mediaElement.currentSrc;

    const rawFileName = src ? decodeURIComponent(src.split('/').pop().split('.')[0]) : `שיעור ללא שם`;
    const title = rawFileName.replace(/[-_]/g, ' ');

    const milestones = {25: false, 50: false, 75: false, 90: false};
    let watchTime = 0;
    let interval;

    mediaElement.addEventListener('play', () => {
      if (!interval) {
        interval = setInterval(() => {
          if (!mediaElement.paused && !mediaElement.ended) {
            watchTime += 1;
          }
        }, 1000);
      }

      gtag('event', `${type}_play`, { [`${type}_title`]: title });
    });

    mediaElement.addEventListener('pause', () => {
      clearInterval(interval);
      interval = null;

      gtag('event', `${type}_pause`, {
        [`${type}_title`]: title,
        current_time: Math.floor(mediaElement.currentTime)
      });
    });

    mediaElement.addEventListener('timeupdate', () => {
      const percent = (mediaElement.currentTime / mediaElement.duration) * 100;
      [25, 50, 75, 90].forEach(milestone => {
        if (percent >= milestone && !milestones[milestone]) {
          gtag('event', `${type}_progress`, {
            [`${type}_title`]: title,
            progress: milestone + '%'
          });
          milestones[milestone] = true;
        }
      });
    });

    mediaElement.addEventListener('ended', () => {
      clearInterval(interval);
      interval = null;
      gtag('event', `${type}_complete`, { [`${type}_title`]: title });
    });
    
    window.addEventListener('beforeunload', () => {
      if (watchTime > 0) {
        gtag('event', `${type}_watch_time`, {
          [`${type}_title`]: title,
          seconds_watched: watchTime,
          duration: Math.floor(mediaElement.duration),
        });
      }
    });
  }

  document.querySelectorAll('video').forEach(el => setupMediaTracking(el, 'video'));
  document.querySelectorAll('audio').forEach(el => setupMediaTracking(el, 'audio'));
});