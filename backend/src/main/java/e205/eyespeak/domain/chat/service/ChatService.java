package e205.eyespeak.domain.chat.service;

import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.category.repository.PhraseRepository;
import e205.eyespeak.domain.chat.dto.ChatHistoryResponse;
import e205.eyespeak.domain.chat.dto.ChatMessageRequest;
import e205.eyespeak.domain.chat.dto.ChatMessageResponse;
import e205.eyespeak.domain.communication.entity.Message;
import e205.eyespeak.domain.communication.repository.MessageRepository;
import e205.eyespeak.domain.fcm.service.FcmService;
import e205.eyespeak.domain.recommendation.service.ExpressionRecordService;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.recommendation.entity.Expression;
import e205.eyespeak.domain.recommendation.repository.ExpressionRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.ContentType;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import e205.eyespeak.global.websocket.WebSocketSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * [Unit 4] 채팅 비즈니스 로직
 *
 * <메시지 전송 흐름>
 *   클라이언트 SEND /app/chat → ChatController → ChatService.sendMessage()
 *     1. 매칭 조회
 *     2. contentType별 검증 + content 결정
 *     3. Message 엔티티 DB 저장
 *     4. 발신자에게 WebSocket 응답 (저장 확인용)
 *     5. 상대방이 온라인이면 WebSocket, 보호자가 오프라인이면 FCM (Unit 7)
 *
 * [Unit 5] 채팅 히스토리 조회 (커서 기반 페이징)
 *   GET /api/chat/{matchingId}/messages → ChatRestController → ChatService.getMessages()
 *
 * @Transactional(readOnly = true): 클래스 레벨 기본값. 읽기 전용 트랜잭션 (DB 최적화).
 * 쓰기가 필요한 메서드에만 @Transactional을 따로 붙여서 쓰기 가능으로 덮어씌운다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final MatchingRepository matchingRepository;
    private final MessageRepository messageRepository;
    private final PhraseRepository phraseRepository;
    private final ExpressionRepository expressionRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketSessionManager sessionManager;
    private final FcmService fcmService;
    private final ExpressionRecordService expressionRecordService;

    @Transactional
    public void sendMessage(Long userId, Role senderRole, ChatMessageRequest request) {
        log.info("[Chat] sendMessage 시작: userId={}, role={}, contentType={}, matchingId={}",
                userId, senderRole, request.getContentType(), request.getMatchingId());

        // 1. 매칭 조회 및 소유자 검증
        Matching matching = matchingRepository.findById(request.getMatchingId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));

        // 2. contentType별 검증 + content 결정
        String content = resolveContent(request);

        // 3. Message 엔티티 생성 + DB 저장
        Message message = Message.builder()
                .matching(matching)
                .senderRole(senderRole)
                .contentType(request.getContentType())
                .content(content)
                .phrase(request.getPhraseId() != null
                        ? phraseRepository.findById(request.getPhraseId()).orElse(null)
                        : null)
                .expression(request.getExpressionId() != null
                        ? expressionRepository.findById(request.getExpressionId()).orElse(null)
                        : null)
                .build();

        messageRepository.save(message);
        log.info("[Chat] 메시지 저장 완료: messageId={}", message.getId());

        // 환자가 보낸 메시지면 AI 분류 + 학습 데이터 저장
        if (senderRole == Role.PATIENT) {
            try {
                expressionRecordService.recordExpression(matching.getId(), content);
                log.info("[Chat] 표현 기록 완료: matchingId={}, text={}", matching.getId(), content);
            } catch (Exception e) {
                log.warn("[Chat] 표현 기록 실패 (메시지 전송에 영향 없음): {}", e.getMessage());
            }
        }

        // 4. 응답 DTO 생성
        ChatMessageResponse response = ChatMessageResponse.from(message, userId);

        // 5. 발신자에게 응답 (메시지 저장 확인)
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId), "/queue/chat", response);

        // 6. 상대방에게 전송
        Long recipientUserId = getRecipientUserId(senderRole, matching);
        String recipientId = String.valueOf(recipientUserId);

        log.info("[Chat] 메시지 전송: 발신자={}, 수신자={}, 온라인={}",
                userId, recipientUserId, sessionManager.isOnline(recipientId));

        if (sessionManager.isOnline(recipientId)) {
            // 상대방이 온라인 → WebSocket으로 즉시 전달
            messagingTemplate.convertAndSendToUser(recipientId, "/queue/chat", response);
        } else if (senderRole == Role.PATIENT) {
            // 발신자가 환자 = 수신자가 보호자, 보호자가 오프라인 → FCM 발송
            String fcmToken = matching.getGuardian().getFcmToken();
            fcmService.sendChatNotification(fcmToken, matching.getId(), userId,
                    senderRole.name(), content, message.getId());
        } else {
            // 보호자→환자인데 환자가 오프라인 → 있을 수 없는 상황 (환자는 항상 WebSocket 연결)
            log.warn("환자가 오프라인입니다. recipientUserId={}, matchingId={}",
                    recipientUserId, matching.getId());
        }
    }

    /**
     * [Unit 5] 채팅 히스토리 조회 (커서 기반 페이징)
     *
     * @param userId     요청자의 userId (매칭 소유자 검증용)
     * @param matchingId 조회할 매칭 ID
     * @param cursor     이 messageId보다 이전 메시지를 조회 (null이면 최신부터)
     * @param size       한 페이지에 가져올 메시지 수
     */
    public ChatHistoryResponse getMessages(Long userId, Long matchingId, Long cursor, int size) {
        // 1. 매칭 소유자 검증 — 요청자가 이 매칭의 환자 또는 보호자인지 확인
        Matching matching = getMatchingByUserId(userId);
        if (!matching.getId().equals(matchingId)) {
            throw new BusinessException(ErrorCode.CHAT_MATCHING_MISMATCH);
        }

        // 2. size + 1개 조회 (hasNext 판별용)
        List<Message> messages;
        if (cursor == null) {
            messages = messageRepository.findByMatchingIdOrderByIdDesc(
                    matchingId, PageRequest.of(0, size + 1));
        } else {
            messages = messageRepository.findByMatchingIdAndIdLessThanOrderByIdDesc(
                    matchingId, cursor, PageRequest.of(0, size + 1));
        }

        // 3. hasNext 판별: size+1개보다 많이 나오면 다음 페이지 있음
        boolean hasNext = messages.size() > size;
        List<Message> pageMessages = hasNext ? messages.subList(0, size) : messages;

        // 4. 각 메시지의 senderId를 계산하여 Response DTO 변환
        Long patientUserId = matching.getPatient().getUser().getId();
        Long guardianUserId = matching.getGuardian().getUser().getId();

        List<ChatMessageResponse> responseList = pageMessages.stream()
                .map(msg -> {
                    Long senderId = (msg.getSenderRole() == Role.PATIENT)
                            ? patientUserId : guardianUserId;
                    return ChatMessageResponse.from(msg, senderId);
                })
                .toList();

        // 5. 응답 생성
        return ChatHistoryResponse.builder()
                .messages(responseList)
                .hasNext(hasNext)
                .nextCursor(hasNext ? pageMessages.get(pageMessages.size() - 1).getId() : null)
                .build();
    }

    /**
     * userId로 해당 유저의 매칭을 찾는다.
     * 기존 FavoriteService, LeisureContentService와 동일한 패턴.
     *   userId → User(role) → Patient 또는 Guardian → Matching
     */
    private Matching getMatchingByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            Guardian guardian = guardianRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
            return matchingRepository.findByGuardianId(guardian.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        } else {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PATIENT_NOT_FOUND));
            return matchingRepository.findByPatientId(patient.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        }
    }

    /**
     * contentType별 검증 + 실제 메시지 텍스트 결정
     *   TEXT       → text 필드가 비어있으면 에러, 그대로 반환
     *   PHRASE     → phraseId로 DB 조회 → Phrase.content 반환
     *   EXPRESSION → expressionId로 DB 조회 → Expression.content 반환
     */
    private String resolveContent(ChatMessageRequest request) {
        ContentType type = request.getContentType();

        if (type == null) {
            throw new BusinessException(ErrorCode.CHAT_INVALID_CONTENT_TYPE);
        }

        switch (type) {
            case TEXT -> {
                if (request.getText() == null || request.getText().isBlank()) {
                    throw new BusinessException(ErrorCode.CHAT_TEXT_EMPTY);
                }
                return request.getText();
            }
            case PHRASE -> {
                if (request.getPhraseId() == null) {
                    throw new BusinessException(ErrorCode.CHAT_PHRASE_ID_REQUIRED);
                }
                Phrase phrase = phraseRepository.findById(request.getPhraseId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.PHRASE_NOT_FOUND));
                return phrase.getContent();
            }
            case EXPRESSION -> {
                if (request.getExpressionId() == null) {
                    throw new BusinessException(ErrorCode.CHAT_EXPRESSION_ID_REQUIRED);
                }
                Expression expression = expressionRepository.findById(request.getExpressionId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.EXPRESSION_NOT_FOUND));
                return expression.getContent();
            }
            default -> throw new BusinessException(ErrorCode.CHAT_INVALID_CONTENT_TYPE);
        }
    }

    /**
     * 매칭에서 상대방의 userId를 찾는다.
     * 하나의 매칭에 환자 1명 + 보호자 1명이므로,
     * 내가 PATIENT면 상대방은 Guardian의 userId, 내가 GUARDIAN이면 Patient의 userId.
     */
    private Long getRecipientUserId(Role senderRole, Matching matching) {
        if (senderRole == Role.PATIENT) {
            return matching.getGuardian().getUser().getId();
        } else {
            return matching.getPatient().getUser().getId();
        }
    }
}
