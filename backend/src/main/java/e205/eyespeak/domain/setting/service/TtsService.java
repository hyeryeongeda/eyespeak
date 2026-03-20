package e205.eyespeak.domain.setting.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.setting.dto.response.TtsSettingResponse;
import e205.eyespeak.domain.setting.entity.TtsSetting;
import e205.eyespeak.domain.setting.entity.TtsVoiceFile;
import e205.eyespeak.domain.setting.repository.TtsSettingRepository;
import e205.eyespeak.domain.setting.repository.TtsVoiceFileRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.enums.TtsStatus;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import e205.eyespeak.global.util.FileStorageUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TtsService {

    private static final int MAX_VOICE_FILES = 10;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("mp3", "wav", "mp4");

    private final TtsSettingRepository ttsSettingRepository;
    private final TtsVoiceFileRepository ttsVoiceFileRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;
    private final FileStorageUtil fileStorageUtil;

    public TtsSettingResponse getSettings(Long userId) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);
        TtsSetting ttsSetting = getTtsSetting(matching.getId());
        List<TtsVoiceFile> files = ttsVoiceFileRepository.findByTtsSettingId(ttsSetting.getId());
        return TtsSettingResponse.of(ttsSetting, files);
    }

    @Transactional
    public TtsSettingResponse toggleEnabled(Long userId) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);
        TtsSetting ttsSetting = getTtsSetting(matching.getId());
        ttsSetting.toggleEnabled();
        List<TtsVoiceFile> files = ttsVoiceFileRepository.findByTtsSettingId(ttsSetting.getId());
        return TtsSettingResponse.of(ttsSetting, files);
    }

    @Transactional
    public TtsSettingResponse uploadVoices(Long userId, List<MultipartFile> files) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);
        TtsSetting ttsSetting = getTtsSetting(matching.getId());

        long existingCount = ttsVoiceFileRepository.countByTtsSettingId(ttsSetting.getId());
        if (existingCount + files.size() > MAX_VOICE_FILES) {
            throw new BusinessException(ErrorCode.TTS_VOICE_FILE_LIMIT);
        }

        for (MultipartFile file : files) {
            validateFileExtension(file);
            String relativePath = fileStorageUtil.saveFile(matching.getId(), file);

            TtsVoiceFile voiceFile = TtsVoiceFile.builder()
                    .ttsSetting(ttsSetting)
                    .fileUrl(relativePath)
                    .fileName(file.getOriginalFilename())
                    .build();
            ttsVoiceFileRepository.save(voiceFile);
        }

        if (ttsSetting.getStatus() != TtsStatus.READY) {
            ttsSetting.updateStatus(TtsStatus.READY);
        }

        List<TtsVoiceFile> allFiles = ttsVoiceFileRepository.findByTtsSettingId(ttsSetting.getId());
        return TtsSettingResponse.of(ttsSetting, allFiles);
    }

    @Transactional
    public void deleteVoice(Long userId, Long voiceFileId) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);
        TtsSetting ttsSetting = getTtsSetting(matching.getId());

        TtsVoiceFile voiceFile = ttsVoiceFileRepository.findById(voiceFileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TTS_VOICE_FILE_NOT_FOUND));

        if (!voiceFile.getTtsSetting().getId().equals(ttsSetting.getId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        fileStorageUtil.deleteFile(voiceFile.getFileUrl());
        ttsVoiceFileRepository.delete(voiceFile);

        long remaining = ttsVoiceFileRepository.countByTtsSettingId(ttsSetting.getId());
        if (remaining == 0 && ttsSetting.getStatus() == TtsStatus.READY) {
            ttsSetting.updateStatus(TtsStatus.NONE);
        }
    }

    private void validateGuardianRole(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() != Role.GUARDIAN) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    private Matching getMatchingByUserId(Long userId) {
        Guardian guardian = guardianRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
        return matchingRepository.findByGuardianId(guardian.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
    }

    private TtsSetting getTtsSetting(Long matchingId) {
        return ttsSettingRepository.findByMatchingId(matchingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TTS_SETTING_NOT_FOUND));
    }

    private void validateFileExtension(MultipartFile file) {
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new BusinessException(ErrorCode.TTS_UNSUPPORTED_FORMAT);
        }
    }
}
