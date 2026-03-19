package e205.eyespeak.domain.leisure.controller;

import e205.eyespeak.domain.leisure.dto.request.LeisureContentCreateRequest;
import e205.eyespeak.domain.leisure.dto.request.LeisureContentUpdateRequest;
import e205.eyespeak.domain.leisure.dto.response.LeisureContentResponse;
import e205.eyespeak.domain.leisure.service.LeisureContentService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "여가 콘텐츠", description = "여가 콘텐츠 관리 API. URL 직접 입력 또는 카테고리 선택(sports, news, music, radio, audiobook) 방식으로 등록. 최대 5개.")
@RestController
@RequestMapping("/leisure-contents")
@RequiredArgsConstructor
public class LeisureContentController {

    private final LeisureContentService leisureContentService;

    @Operation(summary = "여가 콘텐츠 목록 조회", description = "등록된 여가 콘텐츠 목록을 조회한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping
    public ApiResponse<List<LeisureContentResponse>> getContents() {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        List<LeisureContentResponse> response = leisureContentService.getContents(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "여가 콘텐츠 등록", description = "URL 또는 YouTube 카테고리 방식으로 콘텐츠를 등록한다. 최대 5개.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "등록 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류 (URL/카테고리 검증 실패, 5개 초과 등)",
                    content = @Content(examples = {
                            @ExampleObject(name = "URL/카테고리 검증", value = "{\"code\":\"LEISURE-1003\",\"message\":\"URL 또는 카테고리 중 하나를 입력해야 합니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "5개 초과", value = "{\"code\":\"LEISURE-1002\",\"message\":\"여가 콘텐츠는 최대 5개까지 등록할 수 있습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "잘못된 URL", value = "{\"code\":\"LEISURE-1005\",\"message\":\"유효하지 않은 YouTube URL입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "잘못된 카테고리", value = "{\"code\":\"LEISURE-1004\",\"message\":\"유효하지 않은 YouTube 카테고리입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    })),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> createContent(@Valid @RequestBody LeisureContentCreateRequest request) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        leisureContentService.createContent(userId, request);
        return ApiResponse.created();
    }

    @Operation(summary = "여가 콘텐츠 수정", description = "기존 콘텐츠의 이름, URL, 카테고리를 변경한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"LEISURE-1003\",\"message\":\"URL 또는 카테고리 중 하나를 입력해야 합니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 또는 타인의 콘텐츠",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "콘텐츠를 찾을 수 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"LEISURE-1001\",\"message\":\"여가 콘텐츠를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PutMapping("/{contentId}")
    public ApiResponse<Void> updateContent(
            @Parameter(description = "여가 콘텐츠의 고유 식별자 (GET 조회 응답의 id 필드)")
            @PathVariable Long contentId,
            @Valid @RequestBody LeisureContentUpdateRequest request) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        leisureContentService.updateContent(userId, contentId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "여가 콘텐츠 삭제", description = "등록된 콘텐츠를 제거한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 또는 타인의 콘텐츠",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "콘텐츠를 찾을 수 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"LEISURE-1001\",\"message\":\"여가 콘텐츠를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @DeleteMapping("/{contentId}")
    public ApiResponse<Void> deleteContent(
            @Parameter(description = "여가 콘텐츠의 고유 식별자 (GET 조회 응답의 id 필드)")
            @PathVariable Long contentId) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        leisureContentService.deleteContent(userId, contentId);
        return ApiResponse.ok();
    }
}
