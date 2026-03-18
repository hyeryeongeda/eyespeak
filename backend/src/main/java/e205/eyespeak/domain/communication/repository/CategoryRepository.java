package e205.eyespeak.domain.communication.repository;

import e205.eyespeak.domain.communication.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}
