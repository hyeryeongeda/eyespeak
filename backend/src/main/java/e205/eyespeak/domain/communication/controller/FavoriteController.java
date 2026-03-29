package e205.eyespeak.domain.communication.controller;

import e205.eyespeak.domain.communication.dto.request.FavoriteCreateRequest;
import e205.eyespeak.domain.communication.dto.request.FavoriteUpdateRequest;
import e205.eyespeak.domain.communication.dto.response.FavoriteResponse;
import e205.eyespeak.domain.communication.service.FavoriteService;
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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "즐겨찾기", description = "즐겨찾기 표현 관리 API. 최대 5개 등록 가능.")
@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(summary = "즐겨찾기 조회", description = "현재 등록된 즐겨찾기 표현 목록을 조회한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping
    public ApiResponse<List<FavoriteResponse>> getFavorites(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<FavoriteResponse> response = favoriteService.getFavorites(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "즐겨찾기 등록", description = "표현을 즐겨찾기에 추가한다. 최대 5개.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "등록 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "5개 초과 또는 중복",
                    content = @Content(examples = {
                            @ExampleObject(name = "5개 초과", value = "{\"code\":\"COMM-605\",\"message\":\"즐겨찾기는 최대 5개까지 등록할 수 있습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "중복 등록", value = "{\"code\":\"COMM-607\",\"message\":\"이미 즐겨찾기에 등록된 표현입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    })),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "표현 또는 매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMM-603\",\"message\":\"문구를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> createFavorite(@Valid @RequestBody FavoriteCreateRequest request,
                                               Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        favoriteService.createFavorite(userId, request);
        return ApiResponse.created();
    }

    @Operation(summary = "즐겨찾기 수정", description = "기존 즐겨찾기를 다른 표현으로 교체한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "중복 등록",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMM-607\",\"message\":\"이미 즐겨찾기에 등록된 표현입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 또는 타인의 즐겨찾기",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "즐겨찾기 또는 표현 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMM-606\",\"message\":\"즐겨찾기를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PutMapping("/{favoriteId}")
    public ApiResponse<Void> updateFavorite(
            @Parameter(description = "즐겨찾기 고유 식별자 (GET 조회 응답의 favoriteId)")
            @PathVariable Long favoriteId,
            @Valid @RequestBody FavoriteUpdateRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        favoriteService.updateFavorite(userId, favoriteId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "즐겨찾기 삭제", description = "즐겨찾기에서 표현을 제거한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 또는 타인의 즐겨찾기",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "즐겨찾기 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMM-606\",\"message\":\"즐겨찾기를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @DeleteMapping("/{favoriteId}")
    public ApiResponse<Void> deleteFavorite(
            @Parameter(description = "즐겨찾기 고유 식별자 (GET 조회 응답의 favoriteId)")
            @PathVariable Long favoriteId,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        favoriteService.deleteFavorite(userId, favoriteId);
        return ApiResponse.ok();
    }
}
