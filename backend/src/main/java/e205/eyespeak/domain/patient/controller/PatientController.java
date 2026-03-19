package e205.eyespeak.domain.patient.controller;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.service.MatchingService;
import e205.eyespeak.domain.patient.dto.request.RegisterPatientRequest;
import e205.eyespeak.domain.patient.dto.response.RegisterPatientResponse;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.service.PatientService;
import e205.eyespeak.domain.routine.service.RoutineService;
import e205.eyespeak.global.common.ApiResponse;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * 환자 프로필 API
 * - GET /patients/me: 환자 본인 정보 조회
 * - POST /patients: 보호자가 환자 정보 등록 + 팀코드 발급
 */
@Tag(name = "환자 프로필", description = "환자 정보 조회/등록 API")
@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;
    private final MatchingService matchingService;
    private final RoutineService routineService;
    private final GuardianRepository guardianRepository;

    @Operation(summary = "환자 본인 정보 조회",
            description = "JWT 토큰으로 로그인한 환자 본인 프로필 조회 (메인화면 '환자 OO 님' 표시용)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201) / 유효하지 않은 토큰(AUTH-202)",
                    content = @Content(examples = {
                            @ExampleObject(name = "토큰 만료", value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "유효하지 않은 토큰", value = "{\"code\":\"AUTH-202\",\"message\":\"유효하지 않은 토큰입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    })),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "환자 정보 없음(PATIENT-301)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"PATIENT-301\",\"message\":\"환자를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/me")
    public ApiResponse<PatientMeResponse> getMe() {
        PatientMeResponse response = new PatientMeResponse(1L, "데모", 1990, "M");
        return ApiResponse.ok(response);
    }

    @Operation(summary = "환자 정보 등록 + 팀코드 발급",
            description = "보호자가 환자 정보를 등록하면 Patient + Matching 생성 후 팀코드를 발급합니다")
    @Transactional
    @PostMapping
    public ResponseEntity<ApiResponse<RegisterPatientResponse>> registerPatient(
            @Valid @RequestBody RegisterPatientRequest request,
            Authentication authentication) {

        // 1. 토큰에서 보호자 조회
        Long userId = (Long) authentication.getPrincipal();
        Guardian guardian = guardianRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));

        // 2. 환자 프로필 생성 (user_id는 NULL — 환자가 가입하면 연결됨)
        Patient patient = patientService.createPatient(
                request.getName(), request.getBirthYear(), request.getGender());

        // 3. 매칭 생성 + 팀코드 발급
        Matching matching = matchingService.createMatching(patient, guardian);

        // 4. 일과 설정 저장
        if (request.getSurvey() != null && request.getSurvey().getRoutines() != null) {
            routineService.saveSurveyRoutines(matching, request.getSurvey().getRoutines());
        }

        // 5. 응답
        RegisterPatientResponse response = RegisterPatientResponse.builder()
                .patientId(patient.getId())
                .teamCode(matching.getInviteCode())
                .createdAt(patient.getCreatedAt())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @Getter
    @Schema(description = "환자 본인 정보 응답")
    static class PatientMeResponse {
        @Schema(description = "환자 프로필 ID", example = "1")
        private final Long patientId;

        @Schema(description = "환자 이름", example = "데모")
        private final String name;

        @Schema(description = "출생 연도", example = "1990")
        private final int birthYear;

        @Schema(description = "성별 (M/F)", example = "M")
        private final String gender;

        PatientMeResponse(Long patientId, String name, int birthYear, String gender) {
            this.patientId = patientId;
            this.name = name;
            this.birthYear = birthYear;
            this.gender = gender;
        }
    }
}
