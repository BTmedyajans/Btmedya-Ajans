/* 404 sayfası için tek iş: font stil dosyasını devreye almak.
   Satır içi işleyici kullanılamaz, içerik güvenlik politikası engelliyor. */
(function () {
  var f = document.getElementById('fontlar');
  if (f && f.media !== 'all') f.media = 'all';
})();
