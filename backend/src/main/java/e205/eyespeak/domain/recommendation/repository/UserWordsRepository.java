package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.UserWords;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWordsRepository extends JpaRepository<UserWords, Long> {
}
