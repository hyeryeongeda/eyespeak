package e205.eyespeak.domain.log.repository;

import e205.eyespeak.domain.log.entity.UsageLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 사용 로그 Repository
 * - 환자 표현 사용 이력 저장 및 통계 조회
 */
public interface UsageLogRepository extends JpaRepository<UsageLog, Long> {

    /** 기간 내 날짜별 사용 횟수 (월간 기록 화면용) */
    @Query("SELECT CAST(u.usedAt AS LocalDate), COUNT(u) " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.usedAt >= :start AND u.usedAt < :end " +
            "GROUP BY CAST(u.usedAt AS LocalDate)")
    List<Object[]> countByMatchingIdGroupByDate(@Param("matchingId") Long matchingId,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    /** 기간 내 총 사용 횟수 */
    @Query("SELECT COUNT(u) FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.usedAt >= :start AND u.usedAt < :end")
    long countByMatchingIdAndUsedAtBetween(@Param("matchingId") Long matchingId,
                                           @Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);

    /** 기간 내 가장 많이 사용한 표현 TOP N */
    @Query("SELECT COALESCE(u.phrase.content, COALESCE(u.expression.content, u.content)), COUNT(u) " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.usedAt >= :start AND u.usedAt < :end " +
            "GROUP BY COALESCE(u.phrase.content, COALESCE(u.expression.content, u.content)) " +
            "ORDER BY COUNT(u) DESC")
    List<Object[]> findTopExpressions(@Param("matchingId") Long matchingId,
                                      @Param("start") LocalDateTime start,
                                      @Param("end") LocalDateTime end,
                                      Pageable pageable);

    /** 표현별 사용 횟수 집계 — AI user-context API용 */
    @Query("SELECT u.expression.id, COUNT(u) " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.expression IS NOT NULL " +
            "GROUP BY u.expression.id")
    List<Object[]> countByMatchingIdGroupByExpression(@Param("matchingId") Long matchingId);

    /** 가장 많이 사용한 표현 (전체 기간) — frequentHint용 */
    @Query("SELECT u.expression.content, COUNT(u) AS cnt " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.expression IS NOT NULL " +
            "GROUP BY u.expression.id " +
            "ORDER BY cnt DESC")
    List<Object[]> findMostFrequentExpression(@Param("matchingId") Long matchingId,
                                              Pageable pageable);

    /** 가장 최근 사용한 표현 — recentHint용 */
    @Query("SELECT u.expression.content " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.expression IS NOT NULL " +
            "ORDER BY u.usedAt DESC")
    List<String> findMostRecentExpressionContent(@Param("matchingId") Long matchingId,
                                                  Pageable pageable);

    /** 오늘 가장 많이 사용한 표현 (content + category + count) — todayData.mostUsedToday용 */
    @Query("SELECT u.expression.content, u.expression.category, COUNT(u) AS cnt " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.expression IS NOT NULL " +
            "AND u.usedAt >= :start AND u.usedAt < :end " +
            "GROUP BY u.expression.id " +
            "ORDER BY cnt DESC")
    List<Object[]> findTodayMostUsedExpression(@Param("matchingId") Long matchingId,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end,
                                               Pageable pageable);

    /** 가장 최근 사용한 표현 상세 (content + category + usedAt) — todayData.lastUsedFeature용 */
    @Query("SELECT u.expression.content, u.expression.category, u.usedAt " +
            "FROM UsageLog u " +
            "WHERE u.matching.id = :matchingId AND u.expression IS NOT NULL " +
            "ORDER BY u.usedAt DESC")
    List<Object[]> findLastUsedExpressionDetail(@Param("matchingId") Long matchingId,
                                                 Pageable pageable);
}
