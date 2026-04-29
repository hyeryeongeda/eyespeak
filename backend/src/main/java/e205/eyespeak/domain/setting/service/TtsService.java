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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TtsService {

    private static final int MAX_VOICE_FILES = 10;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("mp3", "wav", "mp4", "m4a");

    private final TtsSettingRepository ttsSettingRepository;
    private final TtsVoiceFileRepository ttsVoiceFileRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;
    private final FileStorageUtil fileStorageUtil;
    private final RestTemplate restTemplate;

    @Value("${ai.tts.url}")
    private String aiTtsUrl;

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

        // AI TTS 서버에 음성 파일 동기화
        syncVoicesToTtsServer(matching.getId(), files);

        List<TtsVoiceFile> allFiles = ttsVoiceFileRepository.findByTtsSettingId(ttsSetting.getId());
        return TtsSettingResponse.of(ttsSetting, allFiles);
    }

    @Transactional
    public TtsSettingResponse deleteVoice(Long userId, Long voiceFileId) {
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

        List<TtsVoiceFile> remainingFiles = ttsVoiceFileRepository.findByTtsSettingId(ttsSetting.getId());
        if (remainingFiles.isEmpty() && ttsSetting.getStatus() == TtsStatus.READY) {
            ttsSetting.updateStatus(TtsStatus.NONE);
        }

        return TtsSettingResponse.of(ttsSetting, remainingFiles);
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

    /**
     * AI TTS 서버에 음성 파일을 전송하여 레퍼런스 등록
     */
    private void syncVoicesToTtsServer(Long matchingId, List<MultipartFile> files) {
        try {
            String url = aiTtsUrl + "/patients/" + matchingId + "/voice";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("name", "patient-" + matchingId);

            for (MultipartFile file : files) {
                body.add("files", new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return file.getOriginalFilename();
                    }
                });
            }

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, String.class);
            log.info("TTS 서버에 음성 파일 동기화 완료: matchingId={}", matchingId);
        } catch (Exception e) {
            log.warn("TTS 서버 음성 동기화 실패 (합성 시 재시도 가능): matchingId={}, error={}", matchingId, e.getMessage());
        }
    }

    private void validateFileExtension(MultipartFile file) {
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new BusinessException(ErrorCode.TTS_UNSUPPORTED_FORMAT);
        }
    }
}
