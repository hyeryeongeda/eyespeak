package e205.eyespeak.domain.guardian.repository;

import e205.eyespeak.domain.guardian.entity.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GuardianRepository extends JpaRepository<Guardian, Long> {

    Optional<Guardian> findByUserId(Long userId);
}
