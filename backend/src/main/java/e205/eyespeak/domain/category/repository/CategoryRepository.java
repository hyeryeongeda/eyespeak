package e205.eyespeak.domain.category.repository;

import e205.eyespeak.domain.category.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 카테고리 Repository — 시드 데이터 조회용
 */
public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderByDepthAscOrderIndexAsc();
}
