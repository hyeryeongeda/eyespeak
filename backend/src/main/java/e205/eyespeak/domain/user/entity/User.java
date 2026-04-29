package e205.eyespeak.domain.user.entity;

import e205.eyespeak.global.common.BaseEntity;
import e205.eyespeak.global.enums.Role;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공통 로그인 계정
 * - email = login_id, role로 환자/보호자 구분
 * - 환자와 보호자 모두 이 테이블로 인증
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String loginId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private boolean isAgree = false;

    @Builder
    public User(String loginId, String password, String name, Role role) {
        this.loginId = loginId;
        this.password = password;
        this.name = name;
        this.role = role;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
}
