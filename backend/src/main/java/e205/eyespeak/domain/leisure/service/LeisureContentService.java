package e205.eyespeak.domain.leisure.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.leisure.constant.YoutubeCategory;
import e205.eyespeak.domain.leisure.dto.request.LeisureContentCreateRequest;
import e205.eyespeak.domain.leisure.dto.request.LeisureContentUpdateRequest;
import e205.eyespeak.domain.leisure.dto.response.LeisureContentResponse;
import e205.eyespeak.domain.leisure.entity.LeisureContent;
import e205.eyespeak.domain.leisure.repository.LeisureContentRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeisureContentService {

    private static final int MAX_CONTENTS = 5;
    private static final Pattern YOUTUBE_URL_PATTERN = Pattern.compile(
            "^(https?://)?(www\\.)?(youtube\\.com|youtu\\.be)/.+$"
    );

    private final LeisureContentRepository leisureContentRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final MatchingRepository matchingRepository;

    public List<LeisureContentResponse> getContents(Long userId) {
        Matching matching = getMatchingByUserId(userId);

        return leisureContentRepository.findByMatchingId(matching.getId())
                .stream()
                .map(LeisureContentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void createContent(Long userId, LeisureContentCreateRequest request) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        if (leisureContentRepository.countByMatchingId(matching.getId()) >= MAX_CONTENTS) {
            throw new BusinessException(ErrorCode.LEISURE_CONTENT_LIMIT);
        }

        validateUrlOrCategory(request.getUrl(), request.getCategory());

        LeisureContent content = LeisureContent.builder()
                .matching(matching)
                .name(request.getName())
                .url(request.getUrl())
                .category(request.getCategory())
                .build();

        leisureContentRepository.save(content);
    }

    @Transactional
    public void updateContent(Long userId, Long contentId, LeisureContentUpdateRequest request) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        LeisureContent content = leisureContentRepository.findById(contentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEISURE_CONTENT_NOT_FOUND));

        if (!content.getMatching().getId().equals(matching.getId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        validateUrlOrCategory(request.getUrl(), request.getCategory());

        content.updateInfo(request.getName(), request.getUrl(), request.getCategory());
    }

    @Transactional
    public void deleteContent(Long userId, Long contentId) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        LeisureContent content = leisureContentRepository.findById(contentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEISURE_CONTENT_NOT_FOUND));

        if (!content.getMatching().getId().equals(matching.getId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        leisureContentRepository.delete(content);
    }

    private void validateUrlOrCategory(String url, String category) {
        boolean hasUrl = url != null && !url.isBlank();
        boolean hasCategory = category != null && !category.isBlank();

        if (!hasUrl && !hasCategory) {
            throw new BusinessException(ErrorCode.LEISURE_INVALID_CONTENT);
        }
        if (hasUrl && hasCategory) {
            throw new BusinessException(ErrorCode.LEISURE_INVALID_CONTENT);
        }
        if (hasUrl && !YOUTUBE_URL_PATTERN.matcher(url).matches()) {
            throw new BusinessException(ErrorCode.LEISURE_INVALID_URL);
        }
        if (hasCategory && !YoutubeCategory.isValid(category)) {
            throw new BusinessException(ErrorCode.LEISURE_INVALID_CATEGORY);
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            Guardian guardian = guardianRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
            return matchingRepository.findByGuardianId(guardian.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        } else {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PATIENT_NOT_FOUND));
            return matchingRepository.findByPatientId(patient.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        }
    }
}
