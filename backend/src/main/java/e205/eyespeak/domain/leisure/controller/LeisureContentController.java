package e205.eyespeak.domain.leisure.controller;

import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 여가 콘텐츠 API (2.1)
 * - Swagger 명세용 하드코딩 컨트롤러
 * - 보호자가 설정한 여가 콘텐츠를 환자 화면에 전체 조회
 * - 데이터 없으면 빈 배열 [] 반환
 */
@Tag(name = "여가 콘텐츠", description = "환자 여가 페이지 API")
@RestController
@RequestMapping("/leisure-contents")
public class LeisureContentController {

    @Operation(summary = "여가 콘텐츠 전체 조회",
            description = "보호자가 설정한 여가 콘텐츠 전체 목록 조회. 페이지네이션 없이 전체 반환, 프론트에서 처리. "
                    + "데이터 없으면 빈 배열 [] 반환")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음(MATCHING-801)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-801\",\"message\":\"유효하지 않은 팀코드입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping
    public ApiResponse<List<LeisureContentResponse>> getAll() {
        List<LeisureContentResponse> list = List.of(
                new LeisureContentResponse(1L, 1, "스포츠", "https://youtube.com/...", "하이라이트와 응원 콘텐츠"),
                new LeisureContentResponse(2L, 2, "뉴스", "https://youtube.com/...", "짧은 브리핑과 시사 요약")
        );
        return ApiResponse.ok(list);
    }

    @Getter
    @Schema(description = "여가 콘텐츠 응답")
    static class LeisureContentResponse {
        @Schema(description = "여가 콘텐츠 ID", example = "1")
        private final Long leisureContentId;

        @Schema(description = "표시 순서", example = "1")
        private final int position;

        @Schema(description = "콘텐츠 이름 (스포츠, 뉴스, 음악 등)", example = "스포츠")
        private final String name;

        @Schema(description = "콘텐츠 URL (nullable)", example = "https://youtube.com/...", nullable = true)
        private final String url;

        @Schema(description = "부가 설명 (nullable)", example = "하이라이트와 응원 콘텐츠", nullable = true)
        private final String category;

        LeisureContentResponse(Long leisureContentId, int position, String name, String url, String category) {
            this.leisureContentId = leisureContentId;
            this.position = position;
            this.name = name;
            this.url = url;
            this.category = category;
        }
    }
}
