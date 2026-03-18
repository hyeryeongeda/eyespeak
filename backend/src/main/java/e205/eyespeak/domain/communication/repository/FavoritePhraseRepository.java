package e205.eyespeak.domain.communication.repository;

import e205.eyespeak.domain.communication.entity.FavoritePhrase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoritePhraseRepository extends JpaRepository<FavoritePhrase, Long> {
}
