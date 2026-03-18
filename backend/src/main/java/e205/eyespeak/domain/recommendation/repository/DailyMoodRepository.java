package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.DailyMood;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyMoodRepository extends JpaRepository<DailyMood, Long> {
}
