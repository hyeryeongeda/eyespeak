package e205.eyespeak.domain.guardian.service;

import e205.eyespeak.domain.guardian.dto.response.InviteCodeResponse;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuardianService {

    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;

    public InviteCodeResponse getInviteCode(Long userId) {
        Guardian guardian = guardianRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));

        Matching matching = matchingRepository.findByGuardianId(guardian.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));

        return InviteCodeResponse.builder()
                .matchingId(matching.getId())
                .inviteCode(matching.getInviteCode())
                .status(matching.getStatus().name())
                .build();
    }
}
