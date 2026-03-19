package e205.eyespeak.domain.matching.repository;

import e205.eyespeak.domain.matching.entity.Matching;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchingRepository extends JpaRepository<Matching, Long> {
}
