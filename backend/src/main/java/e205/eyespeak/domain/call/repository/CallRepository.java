package e205.eyespeak.domain.call.repository;

import e205.eyespeak.domain.call.entity.Call;
import e205.eyespeak.global.enums.CallType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface CallRepository extends JpaRepository<Call, Long> {

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
