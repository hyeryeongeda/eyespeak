package e205.eyespeak.domain.ai.controller;

import e205.eyespeak.domain.ai.dto.response.GeneralCorpusResponse;
import e205.eyespeak.domain.ai.dto.response.UserContextResponse;
import e205.eyespeak.domain.ai.service.AiService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * AI 서버 전용 내부 API 컨트롤러
 * - JWT 인증 제외, X-AI-API-Key 헤더로 인증
 * - AI 서버가 추천 시스템에 필요한 데이터를 조회하는 엔드포인트 제공
 */
@Tag(name = "AI 내부 API", description = "AI 서버 전용 내부 API")
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @Operation(summary = "환자 맞춤 데이터 통합 조회",
            description = "expressions, user_words, daily_mood, routine, usage_log 등 환자 맞춤 데이터를 통합 반환합니다.")
    @GetMapping("/user-context/{matchingId}")
    public ApiResponse<UserContextResponse> getUserContext(@PathVariable Long matchingId) {
        return ApiResponse.ok(aiService.getUserContext(matchingId));
    }

    @Operation(summary = "범용 말뭉치 전체 조회",
            description = "general_corpus 테이블의 전체 데이터를 반환합니다.")
    @GetMapping("/general-corpus")
    public ApiResponse<List<GeneralCorpusResponse>> getGeneralCorpus() {
        return ApiResponse.ok(aiService.getGeneralCorpus());
    }
}
