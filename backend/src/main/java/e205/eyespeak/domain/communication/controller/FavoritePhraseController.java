package e205.eyespeak.domain.communication.controller;

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
 * 즐겨찾기 문구 API (4.1)
 * - Swagger 명세용 하드코딩 컨트롤러
 * - 보호자가 등록한 즐겨찾기 문구를 전체 조회
 * - 데이터 없으면 빈 배열 [] 반환
 */
@Tag(name = "즐겨찾기", description = "즐겨찾기 문구 조회 API")
@RestController
@RequestMapping("/favorite-phrases")
public class FavoritePhraseController {

    @Operation(summary = "즐겨찾기 문구 전체 조회",
            description = "보호자가 등록한 즐겨찾기 문구 전체 목록 조회. 페이지네이션 없이 전체 반환, 프론트에서 처리. "
                    + "데이터 없으면 빈 배열 [] 반환")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음(MATCHING-801)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-801\",\"message\":\"유효하지 않은 팀코드입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping
    public ApiResponse<List<FavoritePhraseResponse>> getAll() {
        List<FavoritePhraseResponse> list = List.of(
                new FavoritePhraseResponse(1L, 101L, "물 마시고 싶어요", "식사"),
                new FavoritePhraseResponse(2L, 205L, "화장실 가고 싶어요", "배변")
        );
        return ApiResponse.ok(list);
    }

    @Getter
    @Schema(description = "즐겨찾기 문구 응답")
    static class FavoritePhraseResponse {
        @Schema(description = "즐겨찾기 ID", example = "1")
        private final Long favoritePhraseId;

        @Schema(description = "원본 문구 ID", example = "101")
        private final Long phraseId;

        @Schema(description = "문구 내용", example = "물 마시고 싶어요")
        private final String content;

        @Schema(description = "소속 카테고리명", example = "식사")
        private final String categoryName;

        FavoritePhraseResponse(Long favoritePhraseId, Long phraseId, String content, String categoryName) {
            this.favoritePhraseId = favoritePhraseId;
            this.phraseId = phraseId;
            this.content = content;
            this.categoryName = categoryName;
        }
    }
}
