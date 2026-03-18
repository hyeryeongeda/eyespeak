package e205.eyespeak.domain.setting.repository;

import e205.eyespeak.domain.setting.entity.TtsVoiceFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TtsVoiceFileRepository extends JpaRepository<TtsVoiceFile, Long> {

    List<TtsVoiceFile> findByTtsSettingId(Long ttsSettingId);
}
