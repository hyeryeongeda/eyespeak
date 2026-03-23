package e205.eyespeak.domain.recommendation.repository;

import e205.eyespeak.domain.recommendation.entity.UserWords;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserWordsRepository extends JpaRepository<UserWords, Long> {

    /** 매칭별 단어 목록 조회 (matching_id가 PK) */
    Optional<UserWords> findByMatchingId(Long matchingId);
}
