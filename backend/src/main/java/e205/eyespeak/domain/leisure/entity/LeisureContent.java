package e205.eyespeak.domain.leisure.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 여가 콘텐츠
 * - 보호자가 등록, 환자 여가 화면에 노출
 * - position 기반 배치 (matching_id + position 유니크)
 * - url과 category 중 하나는 반드시 존재
 */
@Entity
@Table(name = "leisure_content", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"matching_id", "position"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeisureContent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @Column(nullable = false)
    private Integer position;

    @Column(nullable = false)
    private String name;

    private String url;

    private String category;

    @Builder
    public LeisureContent(Matching matching, Integer position, String name,
                          String url, String category) {
        this.matching = matching;
        this.position = position;
        this.name = name;
        this.url = url;
        this.category = category;
    }
}
