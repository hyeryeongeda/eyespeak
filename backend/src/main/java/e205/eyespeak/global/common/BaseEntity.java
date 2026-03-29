package e205.eyespeak.global.common;

/*
 * 모든 엔티티가 상속받는 공통 엔티티
 *
 * 왜 필요한가?
 * - 거의 모든 테이블에 "언제 만들었는지", "언제 수정했는지"가 필요함
 * - Patient, Guardian, Call 등 모든 엔티티에 createdAt, updatedAt 을 매번 쓰면 중복이니까
 *   여기 한 번만 정의하고 상속받아서 씀
 *
 */

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/*
 * 모든 엔티티가 상속받는 공통 엔티티
 * 엔터티 생성시각, 수정 시각
 */

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public class BaseEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
