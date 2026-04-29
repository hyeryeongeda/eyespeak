package e205.eyespeak.domain.auth.service;

/**
 * 인증 비즈니스 로직
 * - 보호자 회원가입 (User + Guardian 생성 → JWT 발급)
 * - 환자 회원가입 (팀코드로 Matching 조회 → User 생성 → Patient에 연결)
 * - 로그인 (이메일 + 비밀번호 검증 → JWT 발급)
 * - 토큰 갱신 (Refresh Token → 새 Access/Refresh Token 발급)
 */

import e205.eyespeak.domain.auth.dto.request.GuardianSignupRequest;
import e205.eyespeak.domain.auth.dto.request.LoginRequest;
import e205.eyespeak.domain.auth.dto.request.PatientSignupRequest;
import e205.eyespeak.domain.auth.dto.request.RefreshRequest;
import e205.eyespeak.domain.auth.dto.response.AuthResponse;
import e205.eyespeak.domain.auth.dto.response.PatientSignupResponse;
import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.setting.entity.TtsSetting;
import e205.eyespeak.domain.setting.repository.TtsSettingRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.global.enums.MatchingStatus;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import e205.eyespeak.global.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final MatchingRepository matchingRepository;
    private final TtsSettingRepository ttsSettingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public void checkEmail(String email) {
        if (userRepository.existsByLoginId(email)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
    }

    @Transactional
    public AuthResponse signupGuardian(GuardianSignupRequest request) {
        // 이메일 중복 검사
        if (userRepository.existsByLoginId(request.getEmail())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        // User 생성 (비밀번호 암호화)
        User user = User.builder()
                .loginId(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(Role.GUARDIAN)
                .build();
        userRepository.save(user);

        // Guardian 프로필 생성
        Guardian guardian = Guardian.builder()
                .user(user)
                .build();
        guardianRepository.save(guardian);

        // JWT 토큰 발급
        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        // caregiver/GUARDIAN 둘 다 GUARDIAN으로, patient/PATIENT 둘 다 PATIENT로 매핑
        String rawRole = request.getRole().toUpperCase();
        Role role;
        if ("CAREGIVER".equals(rawRole) || "GUARDIAN".equals(rawRole)) {
            role = Role.GUARDIAN;

        } else if ("PATIENT".equals(rawRole)) {
            role = Role.PATIENT;
        } else {
            throw new BusinessException(ErrorCode.LOGIN_FAILED);
        }

        // 이메일로 사용자 조회
        User user = userRepository.findByLoginId(request.getIdentifier())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOGIN_FAILED));

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.LOGIN_FAILED);
        }

        // 역할 검증
        if (user.getRole() != role) {
            throw new BusinessException(ErrorCode.LOGIN_FAILED);
        }

        return buildAuthResponse(user);
    }

    @Transactional
    public PatientSignupResponse signupPatient(PatientSignupRequest request) {
        // 팀코드로 매칭 조회
        Matching matching = matchingRepository.findByInviteCode(request.getTeamCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 매칭 상태 검증: PENDING일 때만 환자 가입 허용
        if (matching.getStatus() != MatchingStatus.PENDING) {
            throw new BusinessException(ErrorCode.INVITE_CODE_ALREADY_USED);
        }

        // Patient 레코드 존재 확인 (보호자 설문으로 생성된 상태)
        if (matching.getPatient() == null) {
            throw new BusinessException(ErrorCode.PATIENT_NOT_FOUND);
        }

        // 이메일 중복 검사
        if (userRepository.existsByLoginId(request.getLoginId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        // User 생성
        User user = User.builder()
                .loginId(request.getLoginId())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(Role.PATIENT)
                .build();
        userRepository.save(user);

        // Patient에 User 연결
        matching.getPatient().linkUser(user);

        // Matching 상태를 LINKED로 변경
        matching.link();

        // TTS 설정 자동 생성 (isEnabled=false, status=NONE)
        TtsSetting ttsSetting = TtsSetting.builder()
                .matching(matching)
                .build();
        ttsSettingRepository.save(ttsSetting);

        // JWT 발급
        String accessToken = jwtProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtProvider.createRefreshToken(user.getId(), user.getRole());

        return PatientSignupResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(AuthResponse.AuthUserDto.builder()
                        .id(user.getId())
                        .userId(user.getId())
                        .matchingId(matching.getId())
                        .role(user.getRole().name())
                        .name(user.getName())
                        .email(user.getLoginId())
                        .teamCode(request.getTeamCode())
                        .build())
                .patientId(matching.getPatient().getId())
                .teamCode(request.getTeamCode())
                .build();
    }

    public AuthResponse refresh(RefreshRequest request) {
        String refreshToken = request.getRefreshToken();

        // refresh token은 유효해야 함 (만료되면 재로그인 필요)
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

        Long userId = jwtProvider.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALID));

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtProvider.createRefreshToken(user.getId(), user.getRole());

        // user → matching 조회하여 teamCode, matchingId 가져오기
        Matching matching = findMatching(user).orElse(null);
        String teamCode = matching != null ? matching.getInviteCode() : null;
        Long matchingId = matching != null ? matching.getId() : null;

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(AuthResponse.AuthUserDto.builder()
                        .id(user.getId())
                        .userId(user.getId())
                        .matchingId(matchingId)
                        .role(user.getRole().name())
                        .name(user.getName())
                        .email(user.getLoginId())
                        .teamCode(teamCode)
                        .build())
                .matchingId(matchingId)
                .build();
    }

    private java.util.Optional<Matching> findMatching(User user) {
        if (user.getRole() == Role.GUARDIAN) {
            return guardianRepository.findByUserId(user.getId())
                    .flatMap(guardian -> matchingRepository.findByGuardianId(guardian.getId()));
        } else {
            return patientRepository.findByUserId(user.getId())
                    .flatMap(patient -> matchingRepository.findByPatientId(patient.getId()));
        }
    }
}
