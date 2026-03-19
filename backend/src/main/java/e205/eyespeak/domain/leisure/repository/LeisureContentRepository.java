package e205.eyespeak.domain.leisure.repository;

import e205.eyespeak.domain.leisure.entity.LeisureContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeisureContentRepository extends JpaRepository<LeisureContent, Long> {

    List<LeisureContent> findByMatchingId(Long matchingId);

    int countByMatchingId(Long matchingId);
}
