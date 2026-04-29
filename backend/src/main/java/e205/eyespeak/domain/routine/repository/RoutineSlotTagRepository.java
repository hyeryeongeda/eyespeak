package e205.eyespeak.domain.routine.repository;

import e205.eyespeak.domain.routine.entity.RoutineSlotTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutineSlotTagRepository extends JpaRepository<RoutineSlotTag, Long> {

    List<RoutineSlotTag> findByMatchingId(Long matchingId);

    /** 매칭 + 시간대로 활동 조회 (스케줄 hint용) */
    List<RoutineSlotTag> findByMatchingIdAndTimeSlotId(Long matchingId, Long timeSlotId);

    void deleteByMatchingId(Long matchingId);
}
