package e205.eyespeak.domain.patient.entity;

import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.global.common.BaseEntity;
import e205.eyespeak.global.enums.Gender;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 환자 프로필
 * - 보호자가 초기 설문에서 생성 (이 시점에 user_id는 NULL)
 * - 환자가 초대코드로 가입하면 user_id 연결
 */
@Entity
@Table(name = "patient")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Patient extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer birthYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    private String fcmToken;

    @Builder
    public Patient(User user, String name, Integer birthYear, Gender gender) {
        this.user = user;
        this.name = name;
        this.birthYear = birthYear;
        this.gender = gender;
    }

    public void linkUser(User user) {
        this.user = user;
    }

    public void updateInfo(String name, Integer birthYear, Gender gender) {
        this.name = name;
        this.birthYear = birthYear;
        this.gender = gender;
    }

    /** [Unit 6] FCM 토큰 등록/갱신/삭제. null을 넣으면 삭제 효과. */
    public void updateFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }
}
