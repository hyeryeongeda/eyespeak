package e205.eyespeak.domain.chat.service;

import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.category.repository.PhraseRepository;
import e205.eyespeak.domain.chat.dto.ChatMessageRequest;
import e205.eyespeak.domain.chat.dto.ChatMessageResponse;
import e205.eyespeak.domain.communication.entity.Message;
import e205.eyespeak.domain.communication.repository.MessageRepository;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * [Unit 4] 채팅 비즈니스 로직
 *
 * <메시지 전송 흐름>
 *   클라이언트 SEND /app/chat → ChatController → ChatService.sendMessage()
 *     1. 매칭 조회
 *     2. contentType별 검증 + content 결정
 *     3. Message 엔티티 DB 저장
 *     4. 발신자에게 WebSocket 응답 (저장 확인용)
 *     5. 상대방이 온라인이면 WebSocket, 오프라인이면 FCM (Unit 7)
 *
 * @Transactional(readOnly = true): 클래스 레벨 기본값. 읽기 전용 트랜잭션 (DB 최적화).
 * 쓰기가 필요한 메서드에만 @Transactional을 따로 붙여서 쓰기 가능으로 덮어씌운다.
 */
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

    @Transactional
    public void sendMessage(Long userId, Role senderRole, ChatMessageRequest request) {
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

        // 4. 응답 DTO 생성
        ChatMessageResponse response = ChatMessageResponse.from(message, userId);

        // 5. 발신자에게 응답 (메시지 저장 확인)
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId), "/queue/chat", response);

        // 6. 상대방에게 전송
        Long recipientUserId = getRecipientUserId(senderRole, matching);
        String recipientId = String.valueOf(recipientUserId);

        if (sessionManager.isOnline(recipientId)) {
            messagingTemplate.convertAndSendToUser(recipientId, "/queue/chat", response);
        }
        // else: Unit 7에서 FCM 연동
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
