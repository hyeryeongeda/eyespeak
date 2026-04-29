package e205.eyespeak.domain.communication.repository;

import e205.eyespeak.domain.communication.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * [Unit 5] 커서 기반 페이징 — 첫 페이지 (cursor 없을 때)
     * 해당 매칭의 최신 메시지부터 (size + 1)개 조회.
     * +1개를 더 가져오는 이유: 실제 size보다 많이 나오면 hasNext = true 판별용.
     */
    @Query("SELECT m FROM Message m WHERE m.matching.id = :matchingId " +
            "ORDER BY m.id DESC")
    List<Message> findByMatchingIdOrderByIdDesc(@Param("matchingId") Long matchingId,
                                                 org.springframework.data.domain.Pageable pageable);

    /**
     * [Unit 5] 커서 기반 페이징 — 다음 페이지 (cursor 있을 때)
     * cursor(messageId)보다 이전 메시지를 (size + 1)개 조회.
     */
    @Query("SELECT m FROM Message m WHERE m.matching.id = :matchingId AND m.id < :cursor " +
            "ORDER BY m.id DESC")
    List<Message> findByMatchingIdAndIdLessThanOrderByIdDesc(@Param("matchingId") Long matchingId,
                                                              @Param("cursor") Long cursor,
                                                              org.springframework.data.domain.Pageable pageable);
}
