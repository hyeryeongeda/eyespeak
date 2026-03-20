package e205.eyespeak.global.config;

/*
 * CORS(Cross-Origin Resource Sharing) 설정
 *
 * 로컬에서 프론트가 백엔드로 요청하면 포트가 달라서 브라우저가 차단함
 * 여기서 허용할 출처를 등록하면 프론트가 API 를 호출할 수 있음
 * dev/prod 에서는 같은 도메인이라 CORS 문제 없지만 로컬개발 + dev 테스트를 위해 설정
 */

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // 허용할 출처(프론트엔드 주소)
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",         // 로컬 Docker 프론트
                "http://localhost:5173"          // 로컬 Vite 프론트
                // TODO: 도메인 추가하기
                // "https://도메인.com",            // prod 프론트
                // "https://dev.도메인.com"         // dev 프론트
        ));

        // 허용할 HTTP 메서드
        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));

        // 허용할 헤더 (Authorization -> JWT 토큰 보낼 때 필요)
        config.setAllowedHeaders(List.of("*"));

        // 쿠키/인증 정보 포함 허용
        config.setAllowCredentials(true);

        // preflight 요청 캐시 시간(초)
        // 브라우저가 OPTIONS 요청을 보내서 허용 여부를 먼저 확인하는데,
        // 이 결과를 3600 초(1시간) 동안 캐시해서 매번 안보내게 함
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
