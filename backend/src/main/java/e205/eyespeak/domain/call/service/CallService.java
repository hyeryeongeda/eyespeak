package e205.eyespeak.domain.call.service;

import e205.eyespeak.domain.call.dto.CallAcknowledgeResponse;
import e205.eyespeak.domain.call.dto.CallRequest;
import e205.eyespeak.domain.call.dto.CallResponse;
import e205.eyespeak.domain.call.entity.Call;
import e205.eyespeak.domain.call.repository.CallRepository;
import e205.eyespeak.domain.fcm.service.FcmService;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.CallStatus;
import e205.eyespeak.global.enums.CallType;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import e205.eyespeak.global.websocket.WebSocketSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * [Unit 8] 호출(CALL/SOS) 비즈니스 로직
 *
 * <호출 생성 흐름>
 *   환자 POST /api/calls → CallController → CallService.createCall()
 *     1. 빈도 제한 체크 (30초 이내 재호출 차단)
 *     2. Call 엔티티 생성 (PENDING) + DB 저장
 *     3. 보호자에게 FCM 항상 발송 (긴급하므로 온라인 여부 무관)
 *     4. 보호자가 온라인이면 WebSocket 추가 전송 (UI 즉시 갱신용)
 *
 * <호출 확인 흐름>
 *   보호자 PATCH /api/calls/{callId}/acknowledge → CallService.acknowledgeCall()
 *     1. Call 상태: PENDING → RECEIVED
 *     2. 환자에게 WebSocket 알림 ("보호자가 확인했다")
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CallService {

    private final CallRepository callRepository;
    private final MatchingRepository matchingRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final FcmService fcmService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketSessionManager sessionManager;

    @Transactional
    public CallResponse createCall(Long userId, CallRequest request) {
        // 1. 매칭 조회
        Matching matching = matchingRepository.findById(request.getMatchingId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));

        // 2. 빈도 제한 체크 — 30초 이내 같은 매칭의 호출이 있으면 거부
        callRepository.findTopByMatchingIdOrderByCreatedAtDesc(matching.getId())
                .ifPresent(lastCall -> {
                    if (lastCall.getCreatedAt().plusSeconds(30).isAfter(LocalDateTime.now())) {
                        throw new BusinessException(ErrorCode.CALL_RATE_LIMITED);
                    }
                });

        // 3. Call 엔티티 생성 + DB 저장
        Call call = Call.builder()
                .matching(matching)
                .type(request.getType())
                .status(CallStatus.PENDING)
                .build();

        callRepository.save(call);

        // 4. 응답 DTO 생성
        CallResponse response = CallResponse.from(call, userId);

        // 5. 보호자에게 FCM 항상 발송 (긴급하므로 온라인 여부 무관)
        String fcmToken = matching.getGuardian().getFcmToken();
        String displayType = request.getType() == CallType.NORMAL ? "CALL" : "SOS";
        fcmService.sendCallNotification(fcmToken, matching.getId(), userId, displayType, call.getId());

        // 6. 보호자가 온라인이면 WebSocket 추가 전송 (UI 즉시 갱신용)
        Long guardianUserId = matching.getGuardian().getUser().getId();
        String guardianId = String.valueOf(guardianUserId);

        if (sessionManager.isOnline(guardianId)) {
            messagingTemplate.convertAndSend(
                    "/topic/matching/" + matching.getId() + "/call", response);
        }

        return response;
    }

    @Transactional
    public CallAcknowledgeResponse acknowledgeCall(Long userId, Long callId) {
        // 1. Call 조회
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CALL_NOT_FOUND));

        // 2. 상태 변경: PENDING → RECEIVED (더티 체킹으로 자동 UPDATE)
        call.acknowledge();

        // 3. 환자에게 WebSocket 알림 ("보호자가 확인했다")
        Matching matching = call.getMatching();
        Long patientUserId = matching.getPatient().getUser().getId();

        CallAcknowledgeResponse response = CallAcknowledgeResponse.builder()
                .callId(call.getId())
                .matchingId(matching.getId())
                .status(call.getStatus())
                .acknowledgedAt(LocalDateTime.now())
                .build();

        messagingTemplate.convertAndSendToUser(
                String.valueOf(patientUserId), "/queue/call", response);

        return response;
    }
}
