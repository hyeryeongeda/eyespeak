package e205.eyespeak.domain.communication.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 선택 가능한 개별 표현 (시드 데이터)
 * - Category에 속하는 구체적 문장
 * - 예: "목이 마르다", "배가 아프다"
 */
@Entity
@Table(name = "phrase")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Phrase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private Integer orderIndex;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
