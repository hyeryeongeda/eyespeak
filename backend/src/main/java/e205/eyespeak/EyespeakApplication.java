package e205.eyespeak;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/*
 * 어플리케이션 메인 클래스
 *
 * @EnableJpaAuditing: JPA 가 엔티티의 생성시간/수정시간을 자동으로 넣어주는 기능 켜기
 * BaseEntity 에서 @CreatedDate, @LastModifiedDate 를 사용하려면 필수
 * 이걸 안붙이면 createdAt, updatedAt 이 null 로 들어감.
 * JPA 가 엔티티 저장/수정 시 자동으로 시간을 채워주는 기능을 활성화하는 어노테이션
 */

@EnableJpaAuditing
@SpringBootApplication
public class EyespeakApplication {
	public static void main(String[] args) {
		SpringApplication.run(EyespeakApplication.class, args);
	}

}
