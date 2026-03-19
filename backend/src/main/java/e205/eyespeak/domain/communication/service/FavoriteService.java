package e205.eyespeak.domain.communication.service;

import e205.eyespeak.domain.communication.dto.request.FavoriteCreateRequest;
import e205.eyespeak.domain.communication.dto.request.FavoriteUpdateRequest;
import e205.eyespeak.domain.communication.dto.response.FavoriteResponse;
import e205.eyespeak.domain.communication.entity.FavoritePhrase;
import e205.eyespeak.domain.communication.entity.Phrase;
import e205.eyespeak.domain.communication.repository.FavoritePhraseRepository;
import e205.eyespeak.domain.communication.repository.PhraseRepository;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoriteService {

    private static final int MAX_FAVORITES = 5;

    private final FavoritePhraseRepository favoritePhraseRepository;
    private final PhraseRepository phraseRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final MatchingRepository matchingRepository;

    public List<FavoriteResponse> getFavorites(Long userId) {
        Matching matching = getMatchingByUserId(userId);

        return favoritePhraseRepository.findByMatchingId(matching.getId())
                .stream()
                .map(FavoriteResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void createFavorite(Long userId, FavoriteCreateRequest request) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        if (favoritePhraseRepository.countByMatchingId(matching.getId()) >= MAX_FAVORITES) {
            throw new BusinessException(ErrorCode.FAVORITE_LIMIT);
        }

        if (favoritePhraseRepository.existsByMatchingIdAndPhraseId(matching.getId(), request.getPhraseId())) {
            throw new BusinessException(ErrorCode.FAVORITE_DUPLICATE);
        }

        Phrase phrase = phraseRepository.findById(request.getPhraseId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PHRASE_NOT_FOUND));

        FavoritePhrase favoritePhrase = FavoritePhrase.builder()
                .matching(matching)
                .phrase(phrase)
                .build();

        favoritePhraseRepository.save(favoritePhrase);
    }

    @Transactional
    public void updateFavorite(Long userId, Long favoriteId, FavoriteUpdateRequest request) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        FavoritePhrase favoritePhrase = favoritePhraseRepository.findById(favoriteId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FAVORITE_NOT_FOUND));

        if (!favoritePhrase.getMatching().getId().equals(matching.getId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        if (favoritePhraseRepository.existsByMatchingIdAndPhraseId(matching.getId(), request.getPhraseId())) {
            throw new BusinessException(ErrorCode.FAVORITE_DUPLICATE);
        }

        Phrase newPhrase = phraseRepository.findById(request.getPhraseId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PHRASE_NOT_FOUND));

        favoritePhraseRepository.delete(favoritePhrase);
        FavoritePhrase newFavorite = FavoritePhrase.builder()
                .matching(matching)
                .phrase(newPhrase)
                .build();
        favoritePhraseRepository.save(newFavorite);
    }

    @Transactional
    public void deleteFavorite(Long userId, Long favoriteId) {
        validateGuardianRole(userId);
        Matching matching = getMatchingByUserId(userId);

        FavoritePhrase favoritePhrase = favoritePhraseRepository.findById(favoriteId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FAVORITE_NOT_FOUND));

        if (!favoritePhrase.getMatching().getId().equals(matching.getId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        favoritePhraseRepository.delete(favoritePhrase);
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
