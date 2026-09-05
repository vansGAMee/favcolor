self.addEventListener('periodicsync', event => {
  if (!event.tag.startsWith('favcolor-daily-color-')) return
  const russian = event.tag.endsWith('-ru')
  event.waitUntil(self.registration.showNotification('Favcolor', {
    body: russian ? 'Когда захотите, сохраните сегодняшний цвет.' : 'When you feel like it, save today’s color.',
    tag: 'favcolor-daily-color',
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
