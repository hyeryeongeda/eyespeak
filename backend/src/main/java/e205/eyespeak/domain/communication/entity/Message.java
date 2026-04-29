package e205.eyespeak.domain.communication.entity;

import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.recommendation.entity.Expression;
import e205.eyespeak.global.enums.ContentType;
import e205.eyespeak.global.enums.Role;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 채팅 메시지
 * - 환자/보호자 양방향 소통
 * - content_type: TEXT(직접 입력), PHRASE(시드 표현), EXPRESSION(맞춤 표현)
 */
@Entity
@Table(name = "message", indexes = {
        @Index(columnList = "matching_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role senderRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContentType contentType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phrase_id")
    private Phrase phrase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expr_id")
    private Expression expression;

    @Column(nullable = false)
    private Boolean isRead = false;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Message(Matching matching, Role senderRole, ContentType contentType,
                   String content, Phrase phrase, Expression expression) {
        this.matching = matching;
        this.senderRole = senderRole;
        this.contentType = contentType;
        this.content = content;
        this.phrase = phrase;
        this.expression = expression;
        this.isRead = false;
    }
}
