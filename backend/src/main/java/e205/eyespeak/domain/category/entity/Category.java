package e205.eyespeak.domain.category.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 계층형 표현 분류 (시드 데이터)
 * - 자기참조로 부모-자식 관계 표현
 * - depth: 0=최상위, 1=중간, 2=말단
 * - 수정 없음 (created_at만 존재, updated_at 없음)
 */
@Entity
@Table(name = "category")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer depth;

    @Column(nullable = false)
    private Integer orderIndex;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
