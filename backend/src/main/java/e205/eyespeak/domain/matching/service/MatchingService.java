package e205.eyespeak.domain.matching.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.global.enums.MatchingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchingService {

    private final MatchingRepository matchingRepository;

    @Transactional
    public Matching createMatching(Patient patient, Guardian guardian) {
        String teamCode = generateTeamCode();

        Matching matching = Matching.builder()
                .patient(patient)
                .guardian(guardian)
                .inviteCode(teamCode)
                .status(MatchingStatus.PENDING)
                .build();

        return matchingRepository.save(matching);
    }

    private String generateTeamCode() {
        // 6자리 대문자+숫자 코드 생성
        String code = UUID.randomUUID().toString().replace("-", "")
                .substring(0, 6).toUpperCase();

        // 중복 확인
        while (matchingRepository.findByInviteCode(code).isPresent()) {
            code = UUID.randomUUID().toString().replace("-", "")
                    .substring(0, 6).toUpperCase();
        }

        return code;
    }
}
