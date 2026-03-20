package e205.eyespeak.domain.log.repository;

import e205.eyespeak.domain.log.entity.UsageLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UsageLogRepository extends JpaRepository<UsageLog, Long> {

    @Query("SELECT CAST(u.usedAt AS LocalDate), COUNT(u) " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.usedAt >= :start AND u.usedAt < :end " +
            "GROUP BY CAST(u.usedAt AS LocalDate)")
    List<Object[]> countByMatchingIdGroupByDate(@Param("matchingId") Long matchingId,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(u) FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.usedAt >= :start AND u.usedAt < :end")
    long countByMatchingIdAndUsedAtBetween(@Param("matchingId") Long matchingId,
                                           @Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(u.phrase.content, COALESCE(u.expression.content, u.content)), COUNT(u) " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.usedAt >= :start AND u.usedAt < :end " +
            "GROUP BY COALESCE(u.phrase.content, COALESCE(u.expression.content, u.content)) " +
            "ORDER BY COUNT(u) DESC")
    List<Object[]> findTopExpressions(@Param("matchingId") Long matchingId,
                                      @Param("start") LocalDateTime start,
                                      @Param("end") LocalDateTime end,
                                      Pageable pageable);
}
