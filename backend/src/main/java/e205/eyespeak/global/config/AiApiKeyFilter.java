package e205.eyespeak.global.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * AI 서버 전용 내부 API 인증 필터
 * - /ai/** 경로에만 적용
 * - X-AI-API-Key 헤더 값을 설정 파일의 키와 비교
 * - 불일치 시 401 반환
 */
@Component
public class AiApiKeyFilter extends OncePerRequestFilter {

    @Value("${ai.internal.api-key}")
    private String expectedApiKey;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // /ai/ 로 시작하는 경로에만 필터 적용, 나머지는 건너뜀
        String path = request.getServletPath();
        return !path.startsWith("/ai/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String apiKey = request.getHeader("X-AI-API-Key");

        if (expectedApiKey.equals(apiKey)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"code\":\"AI-704\",\"message\":\"내부 API 인증에 실패하였습니다\"}");
        }
    }
}
