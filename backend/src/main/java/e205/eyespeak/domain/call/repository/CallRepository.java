package e205.eyespeak.domain.call.repository;

import e205.eyespeak.domain.call.entity.Call;
import e205.eyespeak.global.enums.CallType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CallRepository extends JpaRepository<Call, Long> {

    /**
     * [Unit 8] 빈도 제한용 — 해당 매칭의 가장 최근 호출 1건 조회.
     * 메서드 이름 규칙: findTop(1개) + ByMatchingId(조건) + OrderByCreatedAtDesc(최신순)
     */
    Optional<Call> findTopByMatchingIdOrderByCreatedAtDesc(Long matchingId);

    @Query("SELECT DISTINCT CAST(c.createdAt AS LocalDate) " +
            "FROM Call c " +
            "WHERE c.matching.id = :matchingId AND c.type = :type " +
            "AND c.createdAt >= :start AND c.createdAt < :end")
    List<LocalDate> findDistinctDatesByMatchingIdAndType(@Param("matchingId") Long matchingId,
                                                         @Param("type") CallType type,
                                                         @Param("start") LocalDateTime start,
                                                         @Param("end") LocalDateTime end);

    @Query("SELECT c.type, COUNT(c) FROM Call c " +
            "WHERE c.matching.id = :matchingId AND c.createdAt >= :start AND c.createdAt < :end " +
            "GROUP BY c.type")
    List<Object[]> countByMatchingIdGroupByType(@Param("matchingId") Long matchingId,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);
}
