package e205.eyespeak.domain.setting.controller;

import e205.eyespeak.domain.setting.dto.response.TtsSettingResponse;
import e205.eyespeak.domain.setting.service.TtsService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "TTS 음성 설정", description = "TTS 음성 파일 관리 API. 보호자가 환자 음성 파일을 업로드/삭제하고 TTS 기능을 ON/OFF 할 수 있다. 최대 10개 파일.")
@RestController
@RequestMapping("/tts")
@RequiredArgsConstructor
public class TtsController {

    private final TtsService ttsService;

    @Operation(summary = "TTS 설정 조회", description = "TTS ON/OFF 상태, 학습 상태, 등록된 음성 파일 목록을 조회한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭/TTS 설정 없음",
                    content = @Content(examples = {
                            @ExampleObject(name = "매칭 없음", value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "TTS 설정 없음", value = "{\"code\":\"TTS-1101\",\"message\":\"TTS 설정을 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    }))
    })
    @GetMapping("/settings")
    public ApiResponse<TtsSettingResponse> getSettings() {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        TtsSettingResponse response = ttsService.getSettings(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "TTS ON/OFF 토글", description = "TTS 활성화 여부를 반전시킨다. 요청 body 없이 현재 값을 토글한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "토글 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭/TTS 설정 없음",
                    content = @Content(examples = {
                            @ExampleObject(name = "매칭 없음", value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "TTS 설정 없음", value = "{\"code\":\"TTS-1101\",\"message\":\"TTS 설정을 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    }))
    })
    @PatchMapping("/settings/toggle")
    public ApiResponse<TtsSettingResponse> toggleEnabled() {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        TtsSettingResponse response = ttsService.toggleEnabled(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "음성 파일 업로드", description = "음성/영상 파일을 업로드한다. 지원 형식: mp3, wav, mp4. 최대 10개.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "업로드 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "파일 형식 또는 개수 오류",
                    content = @Content(examples = {
                            @ExampleObject(name = "지원하지 않는 형식", value = "{\"code\":\"TTS-1102\",\"message\":\"지원하지 않는 파일 형식입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "파일 수 초과", value = "{\"code\":\"TTS-1103\",\"message\":\"최대 10개까지 등록 가능합니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    })),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭/TTS 설정 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"TTS-1101\",\"message\":\"TTS 설정을 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "파일 저장 실패",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"TTS-1105\",\"message\":\"파일 저장에 실패하였습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping("/voices")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TtsSettingResponse> uploadVoices(
            @RequestPart("files") List<MultipartFile> files) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        TtsSettingResponse response = ttsService.uploadVoices(userId, files);
        return ApiResponse.created(response);
    }

    @Operation(summary = "음성 파일 삭제", description = "등록된 음성 파일을 삭제한다. 모든 파일 삭제 시 TTS 상태가 NONE으로 변경된다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 또는 타인의 파일",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "음성 파일 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"TTS-1104\",\"message\":\"TTS 음성 파일을 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @DeleteMapping("/voices/{voiceFileId}")
    public ApiResponse<Void> deleteVoice(
            @Parameter(description = "음성 파일의 고유 식별자 (GET 조회 응답의 id 필드)")
            @PathVariable Long voiceFileId) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        ttsService.deleteVoice(userId, voiceFileId);
        return ApiResponse.ok();
    }
}
