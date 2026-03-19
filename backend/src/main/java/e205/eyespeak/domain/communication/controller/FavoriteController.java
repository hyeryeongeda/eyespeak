package e205.eyespeak.domain.communication.controller;

import e205.eyespeak.domain.communication.dto.request.FavoriteCreateRequest;
import e205.eyespeak.domain.communication.dto.request.FavoriteUpdateRequest;
import e205.eyespeak.domain.communication.dto.response.FavoriteResponse;
import e205.eyespeak.domain.communication.service.FavoriteService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Favorite", description = "즐겨찾기 관리 API")
@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(summary = "즐겨찾기 조회", description = "현재 등록된 즐겨찾기 표현 목록을 조회한다.")
    @GetMapping
    public ApiResponse<List<FavoriteResponse>> getFavorites() {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        List<FavoriteResponse> response = favoriteService.getFavorites(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "즐겨찾기 등록", description = "표현을 즐겨찾기에 추가한다. 최대 5개.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> createFavorite(@Valid @RequestBody FavoriteCreateRequest request) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        favoriteService.createFavorite(userId, request);
        return ApiResponse.created();
    }

    @Operation(summary = "즐겨찾기 수정", description = "기존 즐겨찾기를 다른 표현으로 교체한다.")
    @PutMapping("/{favoriteId}")
    public ApiResponse<Void> updateFavorite(
            @PathVariable Long favoriteId,
            @Valid @RequestBody FavoriteUpdateRequest request) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        favoriteService.updateFavorite(userId, favoriteId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "즐겨찾기 삭제", description = "즐겨찾기에서 표현을 제거한다.")
    @DeleteMapping("/{favoriteId}")
    public ApiResponse<Void> deleteFavorite(@PathVariable Long favoriteId) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        favoriteService.deleteFavorite(userId, favoriteId);
        return ApiResponse.ok();
    }
}
