package e205.eyespeak.domain.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 추천 카테고리 힌트 데이터
 * - getCategories()에서 FE에 반환
 * - getSentences()에서 AI 서버에 전달
 */
@Getter
@AllArgsConstructor
public class HintsDto {
    private final String moodHint;
    private final String scheduleHint;
    private final String frequentHint;
    private final String recentHint;
}
