package e205.eyespeak.domain.user.repository;

import e205.eyespeak.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
