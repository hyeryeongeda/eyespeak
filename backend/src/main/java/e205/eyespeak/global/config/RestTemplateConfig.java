package e205.eyespeak.global.config;

/**
 * RestTemplate Bean 등록
 * - 백엔드에서 다른 서버(AI TTS 등)에 HTTP 요청을 보낼 때 사용
 */

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
