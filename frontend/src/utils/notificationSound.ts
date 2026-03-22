import type { FcmType } from '../shared/stores/notificationStore';
import sosAlertSound from '../assets/sounds/SOS_alert.mp3';
import basicAlertSound from '../assets/sounds/basic_alert.mp3';

const sosAudio = new Audio(sosAlertSound);
const basicAudio = new Audio(basicAlertSound);

export function playNotificationSound(type: FcmType): void {
  const audio = type === 'SOS' ? sosAudio : basicAudio;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
