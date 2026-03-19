package e205.eyespeak.domain.setting.controller;

import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * TTS API (5.1 ~ 6.2)
 * - Swagger 명세용 하드코딩 컨트롤러
 * - 음성 등록/학습 + 음성 변환
 */
@Tag(name = "TTS", description = "TTS 음성 등록·학습·변환 API")
@RestController
@RequestMapping("/tts")
public class TtsController {

    // ========================
    // 5.1 음성 파일 업로드
    // ========================
    @Operation(summary = "음성 파일 업로드",
            description = "TTS 학습용 음성 파일 업로드 (다건 가능). TTS_VOICE_FILE 테이블에 저장")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "업로드 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류 — 파일 없음(COMMON-101)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음(MATCHING-801)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-801\",\"message\":\"유효하지 않은 팀코드입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping(value = "/voices", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<VoiceUploadResponse> uploadVoices(
            @RequestPart("files") List<MultipartFile> files) {
        VoiceUploadResponse response = new VoiceUploadResponse(3, List.of(
                new VoiceFileResponse(1L, "sample_01.wav", "https://storage.../sample_01.wav"),
                new VoiceFileResponse(2L, "sample_02.wav", "https://storage.../sample_02.wav"),
                new VoiceFileResponse(3L, "sample_03.wav", "https://storage.../sample_03.wav")
        ));
        return ApiResponse.created(response);
    }

    // ========================
    // 5.2 TTS 학습 시작
    // ========================
    @Operation(summary = "TTS 학습 시작",
            description = "업로드된 음성 파일로 TTS 모델 학습 시작. TTS_SETTING.status → TRAINING으로 변경")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "학습 시작 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "업로드된 음성 파일 없음(COMMON-101)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음(MATCHING-801)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-801\",\"message\":\"유효하지 않은 팀코드입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping("/train")
    public ApiResponse<TtsTrainResponse> startTraining() {
        return ApiResponse.ok(new TtsTrainResponse("TRAINING"));
    }

    // ========================
    // 5.3 TTS 학습 상태 조회
    // ========================
    @Operation(summary = "TTS 학습 상태 조회",
            description = "현재 TTS 학습 상태 조회 (NONE → TRAINING → READY / FAILED)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음(MATCHING-801)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-801\",\"message\":\"유효하지 않은 팀코드입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/status")
    public ApiResponse<TtsStatusResponse> getStatus() {
        return ApiResponse.ok(new TtsStatusResponse(true, "READY"));
    }

    // ========================
    // 6.1 TTS 변환 요청
    // ========================
    @Operation(summary = "TTS 변환 요청",
            description = "환자가 선택한 문구/표현 텍스트를 TTS 음성으로 변환 요청")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "변환 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "TTS 미활성 — 학습 안됨(COMMON-101)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "AI 서버 응답 실패(AI-701)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AI-701\",\"message\":\"AI 추천 생성에 실패하였습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502", description = "AI 서버 타임아웃(AI-702)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AI-702\",\"message\":\"AI 서버 응답 시간이 초과되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping("/synthesize")
    public ApiResponse<TtsSynthesizeResponse> synthesize(@RequestBody TtsSynthesizeRequest request) {
        return ApiResponse.ok(new TtsSynthesizeResponse("https://storage.../tts_output_abc123.wav"));
    }

    // ========================
    // 6.2 TTS 연동 테스트
    // ========================
    @Operation(summary = "TTS 연동 테스트",
            description = "TTS 학습 완료 후 테스트 문장으로 음성 변환 확인. 텍스트 미입력 시 기본 문장 사용")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "테스트 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "TTS 미활성 — 학습 안됨(COMMON-101)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "AI 서버 응답 실패(AI-701)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AI-701\",\"message\":\"AI 추천 생성에 실패하였습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502", description = "AI 서버 타임아웃(AI-702)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AI-702\",\"message\":\"AI 서버 응답 시간이 초과되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping("/test")
    public ApiResponse<TtsSynthesizeResponse> test(@RequestBody(required = false) TtsTestRequest request) {
        return ApiResponse.ok(new TtsSynthesizeResponse("https://storage.../tts_test_abc123.wav"));
    }

    // ========================
    // DTO
    // ========================

    @Getter
    @Schema(description = "음성 업로드 응답")
    static class VoiceUploadResponse {
        @Schema(description = "업로드된 파일 수", example = "3")
        private final int uploadedCount;

        @Schema(description = "업로드된 파일 목록")
        private final List<VoiceFileResponse> files;

        VoiceUploadResponse(int uploadedCount, List<VoiceFileResponse> files) {
            this.uploadedCount = uploadedCount;
            this.files = files;
        }
    }

    @Getter
    @Schema(description = "음성 파일 정보")
    static class VoiceFileResponse {
        @Schema(description = "음성 파일 ID", example = "1")
        private final Long voiceFileId;

        @Schema(description = "파일명", example = "sample_01.wav")
        private final String fileName;

        @Schema(description = "저장된 파일 URL", example = "https://storage.../sample_01.wav")
        private final String fileUrl;

        VoiceFileResponse(Long voiceFileId, String fileName, String fileUrl) {
            this.voiceFileId = voiceFileId;
            this.fileName = fileName;
            this.fileUrl = fileUrl;
        }
    }

    @Getter
    @Schema(description = "TTS 학습 시작 응답")
    static class TtsTrainResponse {
        @Schema(description = "학습 상태", example = "TRAINING")
        private final String status;

        TtsTrainResponse(String status) {
            this.status = status;
        }
    }

    @Getter
    @Schema(description = "TTS 상태 조회 응답")
    static class TtsStatusResponse {
        @Schema(description = "TTS 활성화 여부", example = "true")
        private final boolean isEnabled;

        @Schema(description = "학습 상태 (NONE/TRAINING/READY/FAILED)", example = "READY")
        private final String status;

        TtsStatusResponse(boolean isEnabled, String status) {
            this.isEnabled = isEnabled;
            this.status = status;
        }
    }

    @Getter
    @NoArgsConstructor
    @Schema(description = "TTS 변환 요청")
    static class TtsSynthesizeRequest {
        @Schema(description = "음성으로 변환할 텍스트", example = "물 마시고 싶어요", requiredMode = Schema.RequiredMode.REQUIRED)
        private String text;
    }

    @Getter
    @Schema(description = "TTS 변환 응답")
    static class TtsSynthesizeResponse {
        @Schema(description = "생성된 TTS 음성 파일 URL", example = "https://storage.../tts_output_abc123.wav")
        private final String audioUrl;

        TtsSynthesizeResponse(String audioUrl) {
            this.audioUrl = audioUrl;
        }
    }

    @Getter
    @NoArgsConstructor
    @Schema(description = "TTS 테스트 요청")
    static class TtsTestRequest {
        @Schema(description = "테스트 문장 (미입력 시 기본 문장 사용)", example = "안녕하세요, 테스트입니다")
        private String text;
    }
}
