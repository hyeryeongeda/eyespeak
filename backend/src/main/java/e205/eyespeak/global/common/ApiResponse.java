package e205.eyespeak.global.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

/*
 * 모든 API 성공 응답을 감싸는 공통 응답 클래스
 *
 * - 프론트엔드가 응답을 파싱할 때 매번 다른 구조면 처리가 힘듦
 * - 모든 API 가 {code, message, data} 동일한 구조로 응답하면
 *   프론트에서 공통 파싱 로직 하나로 처리 가능
 */

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // data 가 null 이면 응답 JSON
public class ApiResponse<T> {

    private String code; // 응답코드(SUCCESS, CREATED 등)
    private String message; // 사람이 읽을 수 있는 메시지
    private T data; // 실제 응답 데이터

    /*
     * 조회, 수정 성공(데이터 있음)
     * 사용: return ApiResponse.ok(patientDto)
     */
    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .code("SUCCESS")
                .message("요청이 성공하였습니다")
                .data(data)
                .build();
    }

    /*
     * 삭제 성공(데이터 없음)
     * 사용: return ApiResponse.ok();
     */
    public static ApiResponse<Void> ok() {
        return ApiResponse.<Void>builder()
                .code("SUCCESS")
                .message("요청이 성공하였습니다")
                .build();
    }

    /*
     * 생성 성공(데이터 있음)
     * 사용: return ApiResponse.created(new PatientDto);
     */
    public static <T> ApiResponse<T> created(T data) {
        return ApiResponse.<T>builder()
                .code("CREATED")
                .message("생성에 성공하였습니다")
                .data(data)
                .build();
    }

    /*
     * 생성 성공(데이터 없음)
     * 사용: return ApiResponse.created();
     */
    public static ApiResponse<Void> created() {
        return ApiResponse.<Void>builder()
                .code("CREATED")
                .message("생성에 성공하였습니다")
                .build();
    }
}
