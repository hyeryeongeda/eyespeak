package e205.eyespeak.domain.communication.repository;

import e205.eyespeak.domain.communication.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {
}
