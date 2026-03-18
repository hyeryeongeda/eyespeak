package e205.eyespeak.domain.routine.repository;

import e205.eyespeak.domain.routine.entity.ActivityTag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityTagRepository extends JpaRepository<ActivityTag, Long> {
}
