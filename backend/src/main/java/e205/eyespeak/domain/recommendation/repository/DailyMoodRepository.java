package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.DailyMood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyMoodRepository extends JpaRepository<DailyMood, Long> {

    /** 매칭 + 날짜로 기분 조회 (오늘의 기분 hint용) */
    Optional<DailyMood> findByMatchingIdAndMoodDate(Long matchingId, LocalDate moodDate);
}
