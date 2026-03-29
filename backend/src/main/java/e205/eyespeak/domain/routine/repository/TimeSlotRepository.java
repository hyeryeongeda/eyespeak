package e205.eyespeak.domain.routine.repository;

import e205.eyespeak.domain.routine.entity.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.Optional;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {

    /**
     * 현재 시각이 속하는 TimeSlot 조회
     * - 야간(00:00~06:00)은 startTime > endTime이라 별도 처리
     */
    @Query("SELECT t FROM TimeSlot t WHERE " +
            "(t.startTime <= t.endTime AND t.startTime <= :time AND :time < t.endTime) OR " +
            "(t.startTime > t.endTime AND (t.startTime <= :time OR :time < t.endTime))")
    Optional<TimeSlot> findByTime(@Param("time") LocalTime time);
}
