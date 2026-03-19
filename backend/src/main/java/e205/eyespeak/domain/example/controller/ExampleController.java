package e205.eyespeak.domain.example.controller;

import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Swagger 어노테이션 예시 컨트롤러
 * - 실제 비즈니스 로직 없음, 전부 하드코딩 응답
 * - 새 Controller 만들 때 이 파일을 참고할 것
 * - @Tag, @Operation, @Parameter, @Schema 사용법 예시
 */
@Tag(name = "[예시] 테스트", description = "백엔드 참고용 — 실제 API 아님")
@RestController
@RequestMapping("/test")
public class ExampleController {

    // ========================
    // GET — 단건 조회
    // ========================
    @Operation(summary = "단건 조회", description = "ID로 1건을 조회합니다")
    @GetMapping("/{id}")
    public ApiResponse<ExampleResponse> getOne(
            @Parameter(description = "조회할 ID") @PathVariable Long id) {
        ExampleResponse response = new ExampleResponse(id, "홍길동", 30);
        return ApiResponse.ok(response);
    }

    // ========================
    // GET — 목록 조회 (Query Parameter)
    // ========================
    @Operation(summary = "목록 조회", description = "이름으로 검색합니다")
    @GetMapping
    public ApiResponse<List<ExampleResponse>> getList(
            @Parameter(description = "검색할 이름") @RequestParam(required = false) String name) {
        List<ExampleResponse> list = List.of(
                new ExampleResponse(1L, "홍길동", 30),
                new ExampleResponse(2L, "김철수", 25)
        );
        return ApiResponse.ok(list);
    }

    // ========================
    // POST — 생성
    // ========================
    @Operation(summary = "생성", description = "새로운 항목을 생성합니다")
    @PostMapping
    public ApiResponse<ExampleResponse> create(@RequestBody ExampleCreateRequest request) {
        ExampleResponse response = new ExampleResponse(1L, request.getName(), request.getAge());
        return ApiResponse.created(response);
    }

    // ========================
    // PUT — 전체 수정
    // ========================
    @Operation(summary = "전체 수정", description = "ID에 해당하는 항목을 전체 수정합니다")
    @PutMapping("/{id}")
    public ApiResponse<ExampleResponse> update(
            @Parameter(description = "수정할 ID") @PathVariable Long id,
            @RequestBody ExampleUpdateRequest request) {
        ExampleResponse response = new ExampleResponse(id, request.getName(), request.getAge());
        return ApiResponse.ok(response);
    }

    // ========================
    // PATCH — 부분 수정
    // ========================
    @Operation(summary = "부분 수정", description = "ID에 해당하는 항목의 이름만 수정합니다")
    @PatchMapping("/{id}")
    public ApiResponse<ExampleResponse> patch(
            @Parameter(description = "수정할 ID") @PathVariable Long id,
            @RequestBody ExamplePatchRequest request) {
        ExampleResponse response = new ExampleResponse(id, request.getName(), 30);
        return ApiResponse.ok(response);
    }

    // ========================
    // DELETE — 삭제
    // ========================
    @Operation(summary = "삭제", description = "ID에 해당하는 항목을 삭제합니다")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @Parameter(description = "삭제할 ID") @PathVariable Long id) {
        return ApiResponse.ok();
    }

    // ========================
    // DTO — 요청/응답 데이터 구조
    // ========================

    @Getter
    @NoArgsConstructor
    @Schema(description = "생성 요청")
    static class ExampleCreateRequest {
        @Schema(description = "이름", example = "홍길동")
        private String name;

        @Schema(description = "나이", example = "30")
        private Integer age;
    }

    @Getter
    @NoArgsConstructor
    @Schema(description = "전체 수정 요청")
    static class ExampleUpdateRequest {
        @Schema(description = "이름", example = "김철수")
        private String name;

        @Schema(description = "나이", example = "25")
        private Integer age;
    }

    @Getter
    @NoArgsConstructor
    @Schema(description = "부분 수정 요청")
    static class ExamplePatchRequest {
        @Schema(description = "이름", example = "이영희")
        private String name;
    }

    @Getter
    @Schema(description = "응답")
    static class ExampleResponse {
        @Schema(description = "ID", example = "1")
        private final Long id;

        @Schema(description = "이름", example = "홍길동")
        private final String name;

        @Schema(description = "나이", example = "30")
        private final Integer age;

        ExampleResponse(Long id, String name, Integer age) {
            this.id = id;
            this.name = name;
            this.age = age;
        }
    }
}
