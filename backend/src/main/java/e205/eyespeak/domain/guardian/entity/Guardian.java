package e205.eyespeak.domain.guardian.entity;

import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 보호자 프로필
 * - User와 1:1 연결 (가입 시 즉시 생성)
 */
@Entity
@Table(name = "guardian")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Guardian extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String fcmToken;

    @Builder
    public Guardian(User user) {
        this.user = user;
    }
}
