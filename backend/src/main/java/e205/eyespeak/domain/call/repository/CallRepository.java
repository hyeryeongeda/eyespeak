package e205.eyespeak.domain.call.repository;

import e205.eyespeak.domain.call.entity.Call;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallRepository extends JpaRepository<Call, Long> {
}
