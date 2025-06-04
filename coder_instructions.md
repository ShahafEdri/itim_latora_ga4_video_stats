

### 📝 Developer Instructions

1. **Place this file**: `video_tracking.js` into the Django static directory, preferably under `static/js/`.

2. **Ensure static files are enabled**:

   * Confirm that `STATICFILES_DIRS` is configured correctly in `settings.py`.
   * Confirm `staticfiles` is being served in development and collected for production.

3. **Update the HTML template** where video or audio appears:

   * Add `{% load static %}` at the top
   * Include the GA4 script and the custom JS before `</body>`:

```html
<script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" async></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

// YOU ADD THIS LINE AT THE END OF THE /head ==========
<script src="{% static 'js/video_tracking.js' %}"></script>
```

4. **Make sure `<video>` or `<audio>` elements are rendered with a `<source>` tag** inside them.

5. No backend changes needed — all events are sent to GA4 via the `gtag()` client-side function.


