package e205.eyespeak.domain.communication.repository;

import e205.eyespeak.domain.communication.entity.FavoritePhrase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FavoritePhraseRepository extends JpaRepository<FavoritePhrase, Long> {

    List<FavoritePhrase> findByMatchingId(Long matchingId);

    int countByMatchingId(Long matchingId);

    boolean existsByMatchingIdAndPhraseId(Long matchingId, Long phraseId);
}
