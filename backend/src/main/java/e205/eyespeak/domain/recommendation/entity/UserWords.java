package e205.eyespeak.domain.recommendation.entity;

import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 단어 조합용 사용자 단어 목록
 * - matching_id가 PK이자 FK (Matching과 1:1)
 * - 주어/목적어/동사를 JSON 배열로 저장
 * - 맞춤대화 단어 조합 시 부족분 보충용
 */
@Entity
@Table(name = "user_words")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserWords extends BaseEntity {

    @Id
    private Long matchingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "matching_id")
    private Matching matching;

    @Column(columnDefinition = "JSON")
    private String subjects;

    @Column(columnDefinition = "JSON")
    private String objects;

    @Column(columnDefinition = "JSON")
    private String verbs;

    @Builder
    public UserWords(Matching matching, String subjects, String objects, String verbs) {
        this.matching = matching;
        this.subjects = subjects;
        this.objects = objects;
        this.verbs = verbs;
    }
}
