package e205.eyespeak.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

/**
 * [Unit 6] Firebase Admin SDK 초기화
 *
 * 서버가 FCM(Firebase Cloud Messaging)을 통해 푸시 알림을 보내려면,
 * Firebase 프로젝트에 인증해야 한다.
 * "서비스 계정 키" JSON 파일로 인증하며, 이 파일은 .gitignore에 포함 필수.
 *
 * @PostConstruct: 이 Bean이 생성된 직후 자동으로 init() 실행.
 * 서버 시작 시 한 번만 초기화하면 이후 FirebaseMessaging.getInstance()로 전송 가능.
 */
@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.config-path:google-service.json}")
    private String firebaseConfigPath;

    @PostConstruct
    public void init() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                log.info("Firebase 이미 초기화됨");
                return;
            }

            InputStream serviceAccount = new ClassPathResource(firebaseConfigPath).getInputStream();

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
            log.info("Firebase 초기화 완료");
        } catch (IOException e) {
            log.warn("Firebase 서비스 계정 키 파일을 찾을 수 없습니다: {}. FCM 기능이 비활성화됩니다.", firebaseConfigPath);
        }
    }
}
