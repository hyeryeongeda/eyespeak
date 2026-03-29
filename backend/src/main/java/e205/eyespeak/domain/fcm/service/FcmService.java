package e205.eyespeak.domain.fcm.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * [Unit 6] FCM 푸시 알림 전송 서비스
 *
 * data-only 메시지만 사용한다 (notification 메시지 X).
 * 이유: SOS 호출 시 풀스크린 오버레이 같은 커스텀 UI가 필요하므로,
 *       앱이 직접 수신하여 처리할 수 있는 data-only를 통일 사용.
 *
 * Firebase 제약: data 필드의 모든 값은 String 타입이어야 한다.
 *
 * 전송 실패 시 로그만 남기고 예외를 전파하지 않는다.
 * 이유: FCM 실패 때문에 메시지 저장이나 호출 생성이 롤백되면 안 되므로.
 */
@Slf4j
@Service
public class FcmService {

    /**
     * 채팅 메시지 알림 (보호자가 오프라인일 때)
     */
    public void sendChatNotification(String fcmToken, Long matchingId, Long senderId,
                                      String senderRole, String text, Long messageId) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "CHAT");
        data.put("matchingId", String.valueOf(matchingId));
        data.put("senderId", String.valueOf(senderId));
        data.put("senderRole", senderRole);
        data.put("title", "새 메시지");
        data.put("body", text);
        data.put("messageId", String.valueOf(messageId));
        data.put("timestamp", LocalDateTime.now().toString());

        sendPush(fcmToken, data);
    }

    /**
     * 호출/SOS 알림 (보호자에게 항상 전송)
     */
    public void sendCallNotification(String fcmToken, Long matchingId, Long senderId,
                                      String callType, Long callId) {
        Map<String, String> data = new HashMap<>();
        data.put("type", callType);
        data.put("matchingId", String.valueOf(matchingId));
        data.put("senderId", String.valueOf(senderId));
        data.put("senderRole", "PATIENT");
        data.put("title", "SOS".equals(callType) ? "긴급 호출" : "호출");
        data.put("body", "SOS".equals(callType) ? "환자가 긴급 호출을 보냈습니다" : "환자가 호출을 보냈습니다");
        data.put("callId", String.valueOf(callId));
        data.put("timestamp", LocalDateTime.now().toString());

        sendPush(fcmToken, data);
    }

    /**
     * FCM data-only 메시지 전송.
     * 실패 시 로그만 남기고 예외를 전파하지 않는다.
     */
    private void sendPush(String fcmToken, Map<String, String> data) {
        if (fcmToken == null || fcmToken.isBlank()) {
            log.warn("FCM 토큰이 없어 푸시 알림을 보낼 수 없습니다. data={}", data);
            return;
        }

        if (FirebaseApp.getApps().isEmpty()) {
            log.warn("Firebase가 초기화되지 않아 FCM 전송을 건너뜁니다. data={}", data);
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .putAllData(data)
                    .build();

            String messageId = FirebaseMessaging.getInstance().send(message);
            log.info("FCM 전송 성공: messageId={}, type={}", messageId, data.get("type"));
        } catch (FirebaseMessagingException e) {
            log.error("FCM 전송 실패: token={}, type={}, error={}", fcmToken, data.get("type"), e.getMessage());
        }
    }
}
