package e205.eyespeak.domain.log.repository;

import e205.eyespeak.domain.log.entity.UsageLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsageLogRepository extends JpaRepository<UsageLog, Long> {
}
