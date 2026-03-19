package e205.eyespeak.domain.matching.entity;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.global.common.BaseEntity;
import e205.eyespeak.global.enums.MatchingStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 환자-보호자 연결 (1:1)
 * - 초대코드 기반 매칭
 * - 모든 공유 데이터의 FK 기준 (matching_id)
 */
@Entity
@Table(name = "matching")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Matching extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false, unique = true)
    private Patient patient;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guardian_id", nullable = false, unique = true)
    private Guardian guardian;

    @Column(nullable = false, unique = true)
    private String inviteCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchingStatus status;

    private LocalDateTime linkedAt;

    @Builder
    public Matching(Patient patient, Guardian guardian, String inviteCode, MatchingStatus status) {
        this.patient = patient;
        this.guardian = guardian;
        this.inviteCode = inviteCode;
        this.status = status;
    }
}
