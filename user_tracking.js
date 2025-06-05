//user_tracking.js

function getAnonymousUserId() {
  const key = 'itim_latora_anon_user_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'anon-' + crypto.randomUUID(); // Or use Date.now() + Math.random() if older browser
    localStorage.setItem(key, id);
  }
  return id;
}

{% if request.user.is_authenticated %}
  const customUserId = "{{ request.user.id }}";
  const isRegistered = true;
{% else %}
  const customUserId = getAnonymousUserId();
  const isRegistered = false;
{% endif %}

gtag('set', { custom_user_id: customUserId });
gtag('set', { is_registered_user: isRegistered });


