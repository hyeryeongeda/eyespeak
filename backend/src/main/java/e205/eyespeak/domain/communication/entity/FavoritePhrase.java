package e205.eyespeak.domain.communication.entity;

import e205.eyespeak.domain.category.entity.Phrase;
import e205.eyespeak.domain.matching.entity.Matching;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 환자별 즐겨찾기 표현
 * - matching_id + phrase_id 조합이 유니크
 */
@Entity
@Table(name = "favorite_phrase", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"matching_id", "phrase_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class FavoritePhrase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phrase_id", nullable = false)
    private Phrase phrase;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public FavoritePhrase(Matching matching, Phrase phrase) {
        this.matching = matching;
        this.phrase = phrase;
    }
}
