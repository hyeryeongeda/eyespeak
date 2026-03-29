package e205.eyespeak.domain.setting.repository;

import e205.eyespeak.domain.setting.entity.TtsSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TtsSettingRepository extends JpaRepository<TtsSetting, Long> {

    Optional<TtsSetting> findByMatchingId(Long matchingId);
}
