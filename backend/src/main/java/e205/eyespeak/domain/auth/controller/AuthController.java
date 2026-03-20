package e205.eyespeak.domain.auth.controller;

/**
 * 인증 API 엔드포인트
 * - POST /auth/sign-up/guardian : 보호자 회원가입
 * - POST /auth/patients         : 환자 회원가입 (팀코드 기반)
 * - POST /auth/login            : 로그인 (caregiver/GUARDIAN/PATIENT 지원)
 * - POST /auth/refresh          : 토큰 갱신
 * - POST /auth/log-out          : 로그아웃
 */

import e205.eyespeak.domain.auth.dto.request.EmailCheckRequest;
import e205.eyespeak.domain.auth.dto.request.GuardianSignupRequest;
import e205.eyespeak.domain.auth.dto.request.LoginRequest;
import e205.eyespeak.domain.auth.dto.request.PatientSignupRequest;
import e205.eyespeak.domain.auth.dto.request.RefreshRequest;
import e205.eyespeak.domain.auth.dto.response.AuthResponse;
import e205.eyespeak.domain.auth.dto.response.PatientSignupResponse;
import e205.eyespeak.domain.auth.service.AuthService;
import e205.eyespeak.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/check-email")
    public ResponseEntity<ApiResponse<Void>> checkEmail(
            @Valid @RequestBody EmailCheckRequest request) {
        authService.checkEmail(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/sign-up/guardian")
    public ResponseEntity<ApiResponse<AuthResponse>> signupGuardian(
            @Valid @RequestBody GuardianSignupRequest request) {
        AuthResponse response = authService.signupGuardian(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/patients")
    public ResponseEntity<ApiResponse<PatientSignupResponse>> signupPatient(
            @Valid @RequestBody PatientSignupRequest request) {
        PatientSignupResponse response = authService.signupPatient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/log-out")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // JWT는 stateless라 서버에서 할 일 없음 (프론트에서 토큰 삭제)
        return ResponseEntity.ok(ApiResponse.ok());
    }
}
