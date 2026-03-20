package e205.eyespeak.domain.setting.repository;

import e205.eyespeak.domain.setting.entity.PatientSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientSettingRepository extends JpaRepository<PatientSetting, Long> {

    Optional<PatientSetting> findByMatchingId(Long matchingId);
}
