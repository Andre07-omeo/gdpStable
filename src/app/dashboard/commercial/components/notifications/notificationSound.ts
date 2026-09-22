// src/lib/notifications/notificationSound.ts

export function playNotificationFeedback(priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const freq = priority === 'urgent' ? 880 : priority === 'high' ? 660 : 440;
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    const volume = priority === 'urgent' ? 0.4 : priority === 'high' ? 0.3 : 0.15;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);

    if (priority === 'urgent') {
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 1046;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 200);
    }
  } catch (err) {
    console.warn('⚠️ Son non supporté:', err);
  }

  if ('vibrate' in navigator) {
    try {
      const pattern =
        priority === 'urgent' ? [200, 100, 200, 100, 200] :
        priority === 'high'   ? [200, 100, 200] :
        priority === 'normal' ? [150] :
                                [100];
      navigator.vibrate(pattern);
    } catch (err) {
      console.warn('⚠️ Vibration non supportée:', err);
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function showBrowserNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notif = new Notification(title, {
    body,
    icon: options?.icon || '/favicon.ico',
    tag: options?.tag,
    badge: '/favicon.ico',
  });

  notif.onclick = () => {
    window.focus();
    options?.onClick?.();
    notif.close();
  };

  setTimeout(() => notif.close(), 8000);
}