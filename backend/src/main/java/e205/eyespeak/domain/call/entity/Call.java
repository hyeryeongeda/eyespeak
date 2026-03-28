package e205.eyespeak.domain.call.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.enums.CallStatus;
import e205.eyespeak.global.enums.CallType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 호출 이력 (일반/SOS)
 * - 환자 → 보호자 단방향
 * - 상태: PENDING → RECEIVED(확인) 또는 MISSED(미확인)
 */
@Entity
@Table(name = "calls", indexes = {
        @Index(columnList = "matching_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CallType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CallStatus status;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Call(Matching matching, CallType type, CallStatus status) {
        this.matching = matching;
        this.type = type;
        this.status = status;
    }

    /** [Unit 8] 보호자가 호출을 확인하면 PENDING → RECEIVED로 변경 */
    public void acknowledge() {
        this.status = CallStatus.RECEIVED;
    }
}
