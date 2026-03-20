package e205.eyespeak.domain.patient.controller;

import e205.eyespeak.domain.patient.dto.request.PatientUpdateRequest;
import e205.eyespeak.domain.patient.dto.response.PatientInfoResponse;
import e205.eyespeak.domain.patient.service.PatientService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "환자 기본 정보", description = "보호자용 환자 기본 정보 관리 API")
@RestController
@RequestMapping("/patients/info")
@RequiredArgsConstructor
public class PatientInfoController {

    private final PatientService patientService;

    @Operation(summary = "환자 기본 정보 조회", description = "보호자가 연결된 환자의 기본 정보를 조회한다.")
    @GetMapping
    public ApiResponse<PatientInfoResponse> getPatientInfo(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        PatientInfoResponse response = patientService.getPatientInfo(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "환자 기본 정보 수정", description = "보호자가 연결된 환자의 기본 정보를 수정한다.")
    @PutMapping
    public ApiResponse<Void> updatePatientInfo(@Valid @RequestBody PatientUpdateRequest request,
                                                  Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        patientService.updatePatientInfo(userId, request);
        return ApiResponse.ok();
    }
}
