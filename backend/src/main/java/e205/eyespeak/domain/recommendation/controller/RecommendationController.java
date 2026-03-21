package e205.eyespeak.domain.recommendation.controller;

import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.common.ApiResponse;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 추천 API 컨트롤러
 *
 * 환자의 맞춤대화를 위한 AI 추천 기능을 제공한다.
 *
 * 제공 기능:
 * - GET  /categories    : 추천 카테고리 목록 조회 (hint 포함)
 * - POST /sentences     : 카테고리 기반 추천 문장 3개 생성
 * - POST /replies       : 보호자 메시지 기반 추천 응답 생성
 * - POST /words         : 단계별 추천 단어 조회
 * - POST /compose       : 단어 조합 기반 문장 생성
 * - POST /send          : 추천 문장 발화 (메시지 전송)
 */
@Tag(name = "Recommendation", description = "추천 API")
@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final MatchingRepository matchingRepository;

    @Value("${ai.server.url}")
    private String aiServerUrl;

    // =========================================================================
    // 1. GET /recommendations/categories — 추천 카테고리 목록 조회
    // =========================================================================

    @Operation(summary = "추천 카테고리 조회",
            description = "맞춤대화 진입 시 추천 카테고리 목록을 조회합니다. 각 카테고리에 DB 기반 hint를 포함합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/categories")
    public ApiResponse<CategoriesResponse> getCategories(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Matching matching = getMatchingByUserId(userId);
        Long matchingId = matching.getId();

        // AI 서버에서 hint 데이터 조회
        Map<String, Object> body = new HashMap<>();
        body.put("matching_id", matchingId);

        String moodHint = null;
        String scheduleHint = null;
        String frequentHint = null;
        String recentHint = null;

        try {
            Map result = restTemplate.postForObject(
                    aiServerUrl + "/recommend/hints", buildRequest(body), Map.class);
            if (result != null) {
                moodHint = (String) result.get("mood_hint");
                scheduleHint = (String) result.get("schedule_hint");
                frequentHint = (String) result.get("frequent_hint");
                recentHint = (String) result.get("recent_hint");
            }
        } catch (Exception e) {
            // AI 서버 실패해도 카테고리 목록은 반환 (hint만 null)
        }

        List<CategoryDto> categories = List.of(
                new CategoryDto("mood", "오늘의 기분", "기분 기반 추천", moodHint),
                new CategoryDto("schedule", "오늘 일정", "일정 기반 추천", scheduleHint),
                new CategoryDto("frequent", "자주 쓴 표현", "자주 사용한 표현 추천", frequentHint),
                new CategoryDto("recent", "직전 사용", "최근 사용 표현 추천", recentHint)
        );

        return ApiResponse.ok(new CategoriesResponse(categories));
    }

    // =========================================================================
    // 2. POST /recommendations/sentences — 카테고리 기반 추천 문장 조회
    // =========================================================================

    @Operation(summary = "카테고리 기반 추천 문장 조회",
            description = "선택한 카테고리(mood/schedule/frequent/recent)에 맞는 추천 문장 3개를 생성합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "추천 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "카테고리 값 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "AI 추천 생성 실패",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AI-701\",\"message\":\"AI 추천 생성에 실패하였습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping("/sentences")
    public ApiResponse<SentencesResponse> getSentences(
            @RequestBody SentencesRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Matching matching = getMatchingByUserId(userId);

        if (request.getCategoryKey() == null || request.getCategoryKey().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("matching_id", matching.getId());
        body.put("recommend_type", request.getCategoryKey());
        if (request.getGuardianMessage() != null) {
            body.put("guardian_message", request.getGuardianMessage());
        }
        if (request.getRecentMessages() != null) {
            body.put("recent_messages", request.getRecentMessages());
        }

        try {
            Map result = restTemplate.postForObject(
                    aiServerUrl + "/recommend/category", buildRequest(body), Map.class);
            List<String> sentences = (List<String>) result.get("sentences");
            return ApiResponse.ok(new SentencesResponse(sentences));
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.AI_RECOMMENDATION_FAILED);
        }
    }

    // =========================================================================
    // 공통 헬퍼
    // =========================================================================

    private HttpEntity<Map<String, Object>> buildRequest(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    private Matching getMatchingByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            return guardianRepository.findByUserId(userId)
                    .flatMap(guardian -> matchingRepository.findByGuardianId(guardian.getId()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        } else {
            return patientRepository.findByUserId(userId)
                    .flatMap(patient -> matchingRepository.findByPatientId(patient.getId()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        }
    }

    // =========================================================================
    // DTO
    // =========================================================================

    // --- /sentences 요청/응답 ---
    @Getter
    @NoArgsConstructor
    @Schema(description = "카테고리 기반 추천 문장 요청")
    public static class SentencesRequest {
        @Schema(description = "카테고리 키 (mood / schedule / frequent / recent)", example = "mood")
        private String categoryKey;

        @Schema(description = "보호자 메시지 (선택)", example = "오늘 기분이 어때?", nullable = true)
        private String guardianMessage;

        @Schema(description = "최근 대화 메시지 목록 (선택)", nullable = true)
        private List<String> recentMessages;
    }

    @Getter
    @Schema(description = "카테고리 기반 추천 문장 응답")
    public static class SentencesResponse {
        @Schema(description = "추천 문장 목록 (최대 3개)", example = "[\"오늘 기분이 좋아요\", \"조금 피곤해요\", \"머리가 아파요\"]")
        private final List<String> sentences;

        SentencesResponse(List<String> sentences) {
            this.sentences = sentences;
        }
    }

    // --- /categories 응답 ---
    @Getter
    @Schema(description = "추천 카테고리 목록 응답")
    public static class CategoriesResponse {
        @Schema(description = "카테고리 목록")
        private final List<CategoryDto> categories;

        CategoriesResponse(List<CategoryDto> categories) {
            this.categories = categories;
        }
    }

    @Getter
    @Schema(description = "추천 카테고리")
    public static class CategoryDto {
        @Schema(description = "카테고리 키", example = "mood")
        private final String key;

        @Schema(description = "화면 표시명", example = "오늘의 기분")
        private final String title;

        @Schema(description = "부가 설명", example = "기분 기반 추천")
        private final String description;

        @Schema(description = "DB 기반 힌트", example = "기분 좋음", nullable = true)
        private final String hint;

        CategoryDto(String key, String title, String description, String hint) {
            this.key = key;
            this.title = title;
            this.description = description;
            this.hint = hint;
        }
    }
}
