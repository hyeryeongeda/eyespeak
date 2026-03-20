package e205.eyespeak.domain.routine.repository;

import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutineSlotTagRepository extends JpaRepository<RoutineSlotTag, Long> {

    List<RoutineSlotTag> findByMatchingId(Long matchingId);

    void deleteByMatchingId(Long matchingId);
}
