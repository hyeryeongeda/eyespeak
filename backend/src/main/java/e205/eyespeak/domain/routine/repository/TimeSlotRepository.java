package e205.eyespeak.domain.routine.repository;

import e205.eyespeak.domain.routine.entity.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
}
